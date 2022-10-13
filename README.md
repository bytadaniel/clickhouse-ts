# clickhouse-ts by @bytadaniel

![Travis (.org)](https://img.shields.io/travis/bytadaniel/clickhouse-ts?style=for-the-badge)
![Libraries.io dependency status for GitHub repo](https://img.shields.io/librariesio/github/bytadaniel/clickhouse-ts?style=for-the-badge)
![npms.io (final)](https://img.shields.io/npms-io/final-score/clickhouse-ts?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/bytadaniel/clickhouse-ts?style=for-the-badge)
![GitHub followers](https://img.shields.io/github/followers/bytadaniel?style=social)

#### Select, insert in-memory batches safely and enjoy Clickhouse!

### Hello from [LookFor.sale](https://lookforsale.ru) developer which produces WB Analytics!
![Backers on Open Collective](https://lookforsale.ru/wp-content/uploads/2021/06/lfsw.jpg)

## TS client for clickhouse database with using in-memory caching rows for bulk insertion

### 💙 Typescript
This package is written in TypeScript because Node.js typing development is already an industry standard.
### 🖐 Bulk insert
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
The package has a public license and is available for download to any developer!


## Usage

```js
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
    defaultResponseFormat: 'JSON',
    clickhouseOptions: {
      /* https://clickhouse.tech/docs/en/operations/settings/settings/ */
      send_progress_in_http_headers: '1'
    }
  }
)

```

## Insert
```js
const response = await client.insert('table_strings', rows, {
  responseFormat: 'CSVWithNames' // or other format
  // other query options
})
```

## Select
```js
await clickhouseInstance.query<{ t: string }>('WITH now() as t SELECT t', {
  responseFormat: 'TSV',
  // ...other query options
})
```

## Create
```js
await clickhouseInstance.query(`
  CREATE TABLE strings (
    date DateTime('UTC'),
    string String
  ) Engine = ReplacingMergeTree()
  PARTITION BY toMonday(date)
  ORDER BY (date, string)
`)
```