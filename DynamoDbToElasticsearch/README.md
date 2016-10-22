# DynamoDbToElasticsearch
DynamoDB trigger to index/update/remove items to/in/from Elasticsearch domain

## Installation

* Create DynamoDB table
* Create Elasticsearch domain
* Manage tags for your Elasticsearch domain
  * Add tag with Key equal to your DynamoDB table name. Set the tag Value to the name of a DynamoDB field you want use as Elasticsearch _id
    ![DynamoDbToElasticsearch](https://velaskec.com/assets/images/DynamoDbToElasticsearch.png)
