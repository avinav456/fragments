// src/model/data/aws/index.js

const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const { s3Client, s3BucketName } = require('./s3Client');
const logger = require('../../../logger');

// XXX: temporary use of memory-db until we add DynamoDB
const MemoryDB = require('../memory/memory-db');
const metadata = new MemoryDB();

// Convert a stream of data into a Buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

// Write fragment METADATA to memory (NOT data to S3!)
async function writeFragment(fragment) {
  try {
    // Store fragment metadata in memory (as JSON string)
    const serialized = JSON.stringify(fragment);
    await metadata.put(fragment.ownerId, fragment.id, serialized);

    logger.debug({ fragmentId: fragment.id }, 'Fragment metadata written');
  } catch (err) {
    logger.error({ err, fragmentId: fragment.id }, 'Error writing fragment metadata');
    throw err;
  }
}

// Read a fragment's metadata from memory
async function readFragment(ownerId, id) {
  const serialized = await metadata.get(ownerId, id);
  return typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
}

// Read fragment DATA from S3
async function readFragmentData(ownerId, id) {
  const params = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}`,
  };

  const command = new GetObjectCommand(params);

  try {
    const data = await s3Client.send(command);
    return streamToBuffer(data.Body);
  } catch (err) {
    const { Bucket, Key } = params;
    logger.error({ err, Bucket, Key }, 'Error streaming fragment data from S3');
    throw new Error('unable to read fragment data');
  }
}

//  Write fragment DATA to S3
async function writeFragmentData(ownerId, id, buffer) {
  try {
    const params = {
      Bucket: s3BucketName,
      Key: `${ownerId}/${id}`,
      Body: buffer,
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    logger.debug({ ownerId, id }, 'Fragment data written to S3');
  } catch (err) {
    logger.error({ err, ownerId, id }, 'Error writing fragment data to S3');
    throw err;
  }
}

// Get a list of fragment ids/objects for the given user from memory
async function listFragments(ownerId, expand = false) {
  const fragments = await metadata.query(ownerId);

  if (expand || !fragments) {
    return fragments;
  }

  return fragments.map((fragment) => JSON.parse(fragment).id);
}

// Delete a fragment's metadata from memory and data from S3
async function deleteFragment(ownerId, id) {
  const params = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}`,
  };

  const command = new DeleteObjectCommand(params);

  try {
    // Delete metadata from memory
    await metadata.del(ownerId, id);

    // Delete data from S3
    await s3Client.send(command);

    logger.debug({ ownerId, id }, 'Fragment deleted from S3');
  } catch (err) {
    const { Bucket, Key } = params;
    logger.error({ err, Bucket, Key }, 'Error deleting fragment from S3');
    throw new Error('unable to delete fragment');
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




