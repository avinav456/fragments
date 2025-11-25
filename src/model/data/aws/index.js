// src/model/data/aws/index.js

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const logger = require('../../../logger');

// Create an S3 Client, see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/s3client.html
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // If AWS_S3_ENDPOINT_URL is set (e.g., for LocalStack or MinIO), use that
  ...(process.env.AWS_S3_ENDPOINT_URL && {
    endpoint: process.env.AWS_S3_ENDPOINT_URL,
    forcePathStyle: true,
  }),
});

// The S3 Bucket name to use for fragments. Defaults to `fragments` if not set in env.
const s3BucketName = process.env.AWS_S3_BUCKET_NAME || 'fragments';

logger.info({ s3BucketName }, 'Using AWS S3 Bucket for fragments');

// Writes a fragment's metadata to memory. Returns a Promise
function writeFragment(fragment) {
  // Use the fragment's id as the S3 Object key, and fragment as the value (body)
  const params = {
    Bucket: s3BucketName,
    Key: `${fragment.ownerId}/${fragment.id}`,
    Body: JSON.stringify(fragment),
  };

  // Create a PUT Object command to send to S3
  const command = new PutObjectCommand(params);

  try {
    return s3Client.send(command);
  } catch (err) {
    logger.error({ err }, 'Error writing fragment to S3');
    throw new Error('Unable to write fragment');
  }
}

// Reads a fragment's metadata from memory. Returns a Promise
async function readFragment(ownerId, id) {
  // Use the ownerId and id to create the S3 Object key
  const params = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}`,
  };

  // Create a GET Object command to send to S3
  const command = new GetObjectCommand(params);

  try {
    // Get the object from S3
    const data = await s3Client.send(command);
    // The Body is a stream, so we need to convert it to a string
    const body = await streamToString(data.Body);
    // Parse and return the fragment metadata
    return JSON.parse(body);
  } catch (err) {
    const error = err.$metadata?.httpStatusCode === 404 ? 'not found' : err.message;
    logger.warn({ err, ownerId, id }, `error reading fragment from S3: ${error}`);
    throw new Error(error);
  }
}

// Helper function to convert a stream to a string
async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

// Writes a fragment's data to memory. Returns a Promise
async function writeFragmentData(ownerId, id, data) {
  // Use the ownerId, id, and `.data` suffix to create the S3 Object key
  const params = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}.data`,
    Body: data,
  };

  // Create a PUT Object command to send to S3
  const command = new PutObjectCommand(params);

  try {
    await s3Client.send(command);
    return Promise.resolve();
  } catch (err) {
    logger.error({ err }, 'Error writing fragment data to S3');
    throw new Error('Unable to write fragment data');
  }
}

// Reads a fragment's data from memory. Returns a Promise
async function readFragmentData(ownerId, id) {
  // Use the ownerId, id, and `.data` suffix to create the S3 Object key
  const params = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}.data`,
  };

  // Create a GET Object command to send to S3
  const command = new GetObjectCommand(params);

  try {
    // Get the object from S3
    const data = await s3Client.send(command);
    // The Body is a stream, so we need to convert it to a Buffer
    return streamToBuffer(data.Body);
  } catch (err) {
    const error = err.$metadata?.httpStatusCode === 404 ? 'not found' : err.message;
    logger.warn({ err, ownerId, id }, `error reading fragment data from S3: ${error}`);
    throw new Error(error);
  }
}

// Helper function to convert a stream to a Buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Get a list of fragment ids/objects for the given user from memory.
// Returns a Promise
async function listFragments(ownerId, expand = false) {
  // Use the ownerId as the S3 Object prefix (i.e., all keys that start with `ownerId/`)
  const params = {
    Bucket: s3BucketName,
    Prefix: `${ownerId}/`,
  };

  // Create a LIST Objects command to send to S3
  const command = new ListObjectsV2Command(params);

  try {
    // Get the list of objects from S3
    const data = await s3Client.send(command);

    // If there are no objects, return an empty array
    if (!data.Contents) {
      return Promise.resolve([]);
    }

    // Filter out any keys that end in `.data` (we only want metadata keys)
    const fragments = data.Contents
      .filter((item) => !item.Key.endsWith('.data'))
      .map((item) => item.Key.split('/')[1]); // Get just the id from `ownerId/id`

    // If we don't need to expand, return the array of ids
    if (!expand) {
      return fragments;
    }

    // Otherwise, read each fragment's metadata and return the array of fragments
    return Promise.all(fragments.map((id) => readFragment(ownerId, id)));
  } catch (err) {
    logger.error({ err }, 'Error listing fragments from S3');
    throw new Error('Unable to list fragments');
  }
}

// Deletes a fragment's metadata and data from memory. Returns a Promise
async function deleteFragment(ownerId, id) {
  // Delete both the metadata and data objects from S3
  const metadataParams = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}`,
  };

  const dataParams = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}.data`,
  };

  try {
    // Delete the metadata
    await s3Client.send(new DeleteObjectCommand(metadataParams));
    // Delete the data
    await s3Client.send(new DeleteObjectCommand(dataParams));
    return Promise.resolve();
  } catch (err) {
    logger.error({ err }, 'Error deleting fragment from S3');
    throw new Error('Unable to delete fragment');
  }
}

module.exports = {
  listFragments,
  writeFragment,
  readFragment,
  writeFragmentData,
  readFragmentData,
  deleteFragment,
};