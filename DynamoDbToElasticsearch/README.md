# DynamoDbToElasticsearch
This generic function will index all the DynamoDB table records to an Elasticsearch domain which has tag with Key equal to the DynamoDB table name. Value of the tag indicates which DynamoDB field to use as **_id** property in Elasticsearch.
**Function has caching in place to avoid throttling and to improve performance.**

## Installation

* Create DynamoDB table
* Create Elasticsearch domain (this may take up to 10 minutes)
* Manage tags for your Elasticsearch domain
  * Add tag with Key equal to your DynamoDB table name. Set the tag Value to the name of a DynamoDB field you want use as Elasticsearch **_id**
    ![DynamoDbToElasticsearch](https://velaskec.com/assets/images/DynamoDbToElasticsearch.png)
* [Put Elasticsearch Mapping (optional if you have a field of type Number)](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-mapping.html)
```
curl -XPUT demo/_mappings/item -d 
{
  "properties": {
    "you_number_field_name": { "type": "integer" }
    "you_string_field_name": { "type": "string" }
  }
}
```
* Create AWS Lambda and provide [DynamoDbToElasticsearch/index.js](index.js) content as function body
* Create a trigger in DynamoDB table and attach AWS Lambda function you just created

## Limitations

* Supported DynamoDB Types
  * **S** - String
  * **N** - Number

