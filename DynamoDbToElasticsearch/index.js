'use strict';
const aws = require('aws-sdk');
const path = require('path');
const es = new aws.ES({apiVersion: '2015-01-01'});
/*
 * Cache Elasticsearch domains between different Lambda executions
 */
var esDomains = [];

/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that permits ES domain operations
 * to the role.
 */
const creds = new aws.EnvironmentCredentials('AWS');

module.exports.handler = (event, context, callback) => {
  let _table = event.Records[0].eventSourceARN.split('/')[1].toLowerCase();
  findEsDomainEndpoint(_table, (err, esDomain) => {
    if (err) callback(err);
    else {
      index(esDomain, event.Records, (err) => {
        if(err) callback(err);
        else callback();
      });
    }
  });
};

function findEsDomainEndpoint(table, callback){
  // try to find in cache first
  let _esDomain = esDomains.find((domain) => {
    return domain.index === table;
  });
  if(_esDomain === undefined) {
    es.listDomainNames((err, data) => {
      if (err) callback(err);
      else {
        let _domains = data.DomainNames.map((d) => { return d.DomainName });
        es.describeElasticsearchDomains({ DomainNames: _domains }, (err, data) => {
          if (err) callback(err);
          else {
            findEsDomainByTag(data.DomainStatusList, table, (err, domain) => {
              if (err) callback(err);
              else {
                esDomains.push(domain);
                callback(null, domain);
              }
            });
          }
        });
      }
    });
  } else { // cached
    callback(null, _esDomain);
  }
}

function findEsDomainByTag(domains, tagName, callback){
  if(domains.length > 0) {
    let _domain = domains.shift();
    es.listTags({ ARN: _domain.ARN }, (err, data) => {
      if (err) callback(err);
      else {
        let _tag = data.TagList.find((tag) => {
          return tag.Key.toLowerCase() === tagName.toLowerCase();
        });
        if(_tag !== undefined){
          callback(null, {
            endpoint: _domain.Endpoint,
            region: _domain.ARN.split(':')[3],
            index: tagName,
            doctype: 'item',
            id: _tag.Value // _id field for Elasticsearch
          });
        }
        else findEsDomainByTag(domains, tagName, callback);
      }
    });
  } else callback('Elasticsearch domain with tag ' + tagName + ' not found');
}

function index(esDomain, records, callback){
  if(records.length > 0){
    let _payload = '';
    records.splice(0, records.length > 10000 ? 10000 : records.length).forEach((rec) => {
      let _rec = rec.dynamodb.NewImage ? rec.dynamodb.NewImage : rec.dynamodb.Keys;
      let _doc = {};
      Object.keys(_rec).forEach(function(k){
        if( k !== esDomain.id){
          _doc[k] = _rec[k].S === undefined ? _rec[k].N : _rec[k].S;
        }
      });
      let _id = _rec[esDomain.id].S === undefined ? _rec[esDomain.id].N : _rec[esDomain.id].S;
      switch(rec.eventName){
        case 'INSERT':
          _payload += JSON.stringify({ index: { _id: _id  } }) + '\n' + JSON.stringify(_doc) + '\n';
          break;
        case 'MODIFY':
          _payload += JSON.stringify({ update: { _id: _id  } }) + '\n' + JSON.stringify({doc: _doc}) + '\n';
          break;
        case 'REMOVE':
          _payload += JSON.stringify({ delete: { _id: _id  } }) + '\n';
          break;
      } 
      console.log(_payload);
    });
    let _endpoint =  new aws.Endpoint(esDomain.endpoint);
    let _req = new aws.HttpRequest(_endpoint);
    _req.method = 'POST';
    _req.path = path.join('/', esDomain.index, esDomain.doctype, '_bulk');
    _req.region = esDomain.region;
    _req.body = _payload;
    _req.headers['presigned-expires'] = false;
    _req.headers.Host = _endpoint.host;
    
    // Sign the request (Sigv4)
    var _signer = new aws.Signers.V4(_req, 'es');
    _signer.addAuthorization(creds, new Date());

    // Post document to ES
    let _send = new aws.NodeHttpClient();
    _send.handleRequest(_req, null, (httpResp) => {
      let _body = '';
      httpResp.on('data', (chunk) => {
        _body += chunk;
      });
      httpResp.on('end', (chunk) => {
        _body += chunk;
        console.log(_body);
        index(esDomain, records, callback);
      });
    }, (err) => {
      callback(err);
    });
  } else callback();
}