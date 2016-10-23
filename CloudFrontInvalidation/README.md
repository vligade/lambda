# CloudFrontInvalidation
This generic function will invalidate CloudFront distribution on S3 event. Function has caching in place to avoid throttling and to improve performance. 

## Installation

* Create AWS Lambda and provide [CloudFrontInvalidation/index.js](index.js) content as function body
* Create S3 bucket
* Add Notification (type = Lambda) in bucket properties tab. Attach AWS Lambda function you just created
* Create CloudFront distribution and attach to your bucket
* Upload a file into your bucket and check if invalidation request created (in CloudFront Invalidations tab)


## AWS IAM Role policies

* cloudfront:ListDistributions
* cloudfront:CreateInvalidation