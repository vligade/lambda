'use strict';
const aws = require("aws-sdk");
const cloudfront = new aws.CloudFront({apiVersion: '2016-09-29'});
/*
 * Cache CloudFront distributions list to avoid throttling
 */
var distributions = [];

exports.handler = (event, context, callback) => {
  let _bucketName = event.Records[0].s3.bucket.name; // we assume all events originated from the same bucket
  getDistributionId(_bucketName, (err, id) => {
    if (err) callback(err);
    else {
      createInvalidation(id, context.awsRequestId, event.Records, (err) => {
        if (err) callback(err);
        else callback();
      });
    }
  });
};

function getDistributionId(bucketName, callback){
  getDistributionList((err, data) => {
    if (err) callback(err);
    else {
      let _distributions = data.filter((distr) => {
        return distr.Origins.Items.find((orig) => {
          return orig.DomainName === bucketName + '.s3.amazonaws.com';
        }) !== undefined;
      });
      if(_distributions.length === 0) callback('Check if CloudFront distribution for S3 bucket ' + bucketName + ' has been created');
      else callback(null, _distributions[0].Id); // in theory an S3 bucket can participate in the several CloudFront distributions
    }
  });
}

function getDistributionList(callback){
  if(distributions.length === 0){
    cloudfront.listDistributions({}, (err, data) => {
      if (err) callback(err);
      else {
        distributions = data.Items;
        callback(null, distributions);
      }
    });
  }else { // cached
    callback(null, distributions);
  }
}

function createInvalidation(DistributionId, CallerReference, records, callback){
  let _items = records.map((rec) => {
    return '/' + rec.s3.object.key;
  });
  let _params = {
    DistributionId: DistributionId,
    InvalidationBatch: {
      CallerReference: CallerReference,
      Paths: {
        Quantity: _items.length,
        Items: _items
      }
    }
  };
  cloudfront.createInvalidation(_params, (err, data) => {
    if (err) callback(err);
    else callback();
  });
}