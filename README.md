
<p align="center">
<img src="https://cdn.worldvectorlogo.com/logos/clickhouse.svg" width="200px" align="center">
<h2 align="center">ClickHouse TypeScript client by @bytadaniel</h2>
</p>
<br/>

![Travis (.org)](https://img.shields.io/travis/bytadaniel/clickhouse-ts)
![Libraries.io dependency status for GitHub repo](https://img.shields.io/librariesio/github/bytadaniel/clickhouse-ts)
![npms.io (final)](https://img.shields.io/npms-io/final-score/clickhouse-ts)
![GitHub issues](https://img.shields.io/github/issues/bytadaniel/clickhouse-ts)
[![Join the chat at https://gitter.im/bytadaniel/clickhouse-ts](https://badges.gitter.im/bytadaniel/clickhouse-ts.svg)](https://gitter.im/bytadaniel/clickhouse-ts?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
![GitHub followers](https://img.shields.io/github/followers/bytadaniel?style=social)

## Introduction
### 💙 Typescript
This package is written in TypeScript because Node.js typing development is already an industry standard.
### 🖐 Batch insert*
It has been empirically verified that in-memory collecting rows is the most efficient and consistent way to insert into Clickhouse. To work with built-in caching, you just need to call the useCaching() method
### 💪 Transparent and Stability
clickhouse-ts doesn't use a lot of abstractions and dependencies, so it's fast and stable.
### 🏗 Ready for production
The Lookforsale team has been using clickhouse-ts effectively for over a year under extreme loads!
### 👍 Batch validation
Double checking data for anomalies during in-memory caching and when inserting a finished batch.
### ✨ Flexibility
Flexible configuration of the Clickhouse client instance and support for all features provided by Clickhouse developers.
### 🔐 Security
SQL Injection Protection with sqlstring
### 🌈 Free for use
The package has a public license and is available for download to any developer!## Installation

## *How can I insert in-memory batches?
Starting from version `2.0.0` [the caching module](https://www.npmjs.com/package/clickcache) should be imported separately.
This is because clickcache package, like clickhouse-ts, is going to be part of my Clickhouse Node.js ecosystem.
In addition, it planned to introduce [data validation](https://www.npmjs.com/package/chvalid), as in Joi and model generation, as in mongodb/mongoose.

## Installation
```bash
npm i clickhouse-ts
npm i clickcache
```

## Connection
Only HTTP(s) protocol is supported.

```ts
const client = new Clickhouse(
  {
    url: 'url',
    port: 8443,
    user: 'user',
    password: 'password',
    database: 'database',
    ca: fs.readFileSync('cert.crt')
  },
  {
	/* https://clickhouse.com/docs/en/interfaces/formats */  
    defaultResponseFormat: 'JSON',
    clickhouseOptions: {
      /* https://clickhouse.tech/docs/en/operations/settings/settings/ */
      send_progress_in_http_headers: '1'
    }
  }
)
```

## Usage examples
Basically, this client supports data insertion, but you should consider collecting your data before passing it as an argument here. Use `clickcache` to prepare batches!
## Insert
```ts
const response = await client.insert('table_strings', rows, {
  format: 'CSVWithNames'
})
```

## Select
```ts
await clickhouseInstance.query<{ t: string }>('WITH now() as t SELECT t', {
  format: 'TSV',
  send_progress_in_http_headers: '1'
})
```

## DDL queries
```ts
await clickhouseInstance.query(`
  CREATE TABLE strings (
    date DateTime('UTC'),
    string String
  ) Engine = ReplacingMergeTree()
  PARTITION BY toMonday(date)
  ORDER BY (date, string)
`, { noFormat: true })
```
