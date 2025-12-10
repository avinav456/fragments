
// src/model/data/aws/index.js

const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const ddbDocClient = require('./ddbDocClient');
const { PutCommand, GetCommand, QueryCommand, DeleteCommand  } = require('@aws-sdk/lib-dynamodb');

const { s3Client, s3BucketName } = require('./s3Client');
const logger = require('../../../logger');

// XXX: temporary use of memory-db until we add DynamoDB
// const MemoryDB = require('../memory/memory-db');
// const metadata = new MemoryDB();

// Convert a stream of data into a Buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

// // Write fragment METADATA to memory (NOT data to S3!)
// async function writeFragment(fragment) {
//   try {
//     // Store fragment metadata in memory (as JSON string)
//     const serialized = JSON.stringify(fragment);
//     await metadata.put(fragment.ownerId, fragment.id, serialized);

//     logger.debug({ fragmentId: fragment.id }, 'Fragment metadata written');
//   } catch (err) {
//     logger.error({ err, fragmentId: fragment.id }, 'Error writing fragment metadata');
//     throw err;
//   }
// }


// Writes a fragment to DynamoDB. Returns a Promise.
function writeFragment(fragment) {
  // Configure our PUT params, with the name of the table and item (attributes and keys)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Item: fragment,
  };

  // Create a PUT command to send to DynamoDB
  const command = new PutCommand(params);

  try {
    return ddbDocClient.send(command);
  } catch (err) {
    logger.warn({ err, params, fragment }, 'error writing fragment to DynamoDB');
    throw err;
  }
}

// // Read a fragment's metadata from memory
// async function readFragment(ownerId, id) {
//   const serialized = await metadata.get(ownerId, id);
//   return typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
// }



// Reads a fragment from DynamoDB. Returns a Promise<fragment|undefined>
async function readFragment(ownerId, id) {
  // Configure our GET params, with the name of the table and key (partition key + sort key)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: { ownerId, id },
  };

  // Create a GET command to send to DynamoDB
  const command = new GetCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);
    // We may or may not get back any data (e.g., no item found for the given key).
    // If we get back an item (fragment), we'll return it.  Otherwise we'll return `undefined`.
    return data?.Item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment from DynamoDB');
    throw err;
  }
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

// // Get a list of fragment ids/objects for the given user from memory
// async function listFragments(ownerId, expand = false) {
//   const fragments = await metadata.query(ownerId);

//   if (expand || !fragments) {
//     return fragments;
//   }

//   return fragments.map((fragment) => JSON.parse(fragment).id);
// }

// Get a list of fragments, either ids-only, or full Objects, for the given user.
// Returns a Promise<Array<Fragment>|Array<string>|undefined>
async function listFragments(ownerId, expand = false) {
  // Configure our QUERY params, with the name of the table and the query expression
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    // Specify that we want to get all items where the ownerId is equal to the
    // `:ownerId` that we'll define below in the ExpressionAttributeValues.
    KeyConditionExpression: 'ownerId = :ownerId',
    // Use the `ownerId` value to do the query
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  // Limit to only `id` if we aren't supposed to expand. Without doing this
  // we'll get back every attribute.  The projection expression defines a list
  // of attributes to return, see:
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  // Create a QUERY command to send to DynamoDB
  const command = new QueryCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);

    // If we haven't expanded to include all attributes, remap this array from
    // [ {"id":"b9e7a264-630f-436d-a785-27f30233faea"}, {"id":"dad25b07-8cd6-498b-9aaf-46d358ea97fe"} ,... ] to
    // [ "b9e7a264-630f-436d-a785-27f30233faea", "dad25b07-8cd6-498b-9aaf-46d358ea97fe", ... ]
    return !expand ? data?.Items.map((item) => item.id) : data?.Items
  } catch (err) {
    logger.error({ err, params }, 'error getting all fragments for user from DynamoDB');
    throw err;
  }
}

// // Delete a fragment's metadata from memory and data from S3
// async function deleteFragment(ownerId, id) {
//   const params = {
//     Bucket: s3BucketName,
//     Key: `${ownerId}/${id}`,
//   };

//   const command = new DeleteObjectCommand(params);

//   try {
//     // Delete metadata from memory
//     await metadata.del(ownerId, id);

//     // Delete data from S3
//     await s3Client.send(command);

//     logger.debug({ ownerId, id }, 'Fragment deleted from S3');
//   } catch (err) {
//     const { Bucket, Key } = params;
//     logger.error({ err, Bucket, Key }, 'Error deleting fragment from S3');
//     throw new Error('unable to delete fragment');
//   }
// }



// Delete a fragment's metadata from DynamoDB and data from S3
async function deleteFragment(ownerId, id) {
  // Configure our DELETE params for DynamoDB
  const ddbParams = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: { ownerId, id },
  };

  // Create a DELETE command to send to DynamoDB
  const ddbCommand = new DeleteCommand(ddbParams);

  // Configure our DELETE params for S3
  const s3Params = {
    Bucket: s3BucketName,
    Key: `${ownerId}/${id}`,
  };

  // Create a DELETE command to send to S3
  const s3Command = new DeleteObjectCommand(s3Params);

  try {
    // Delete metadata from DynamoDB
    await ddbDocClient.send(ddbCommand);

    // Delete data from S3
    await s3Client.send(s3Command);

    logger.debug({ ownerId, id }, 'Fragment deleted from DynamoDB and S3');
  } catch (err) {
    logger.error({ err, ownerId, id }, 'Error deleting fragment');
    throw err;
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







