# koa-mongo-proxy (in development - dont you dare download or look at this)

A thin wrapper around the native mongo driver for databases w/ a schema

# Intro
- 1 api to rule them all - the LOTR philosophy.

## Requirements
- ES6
- ES6 proxies
- Koa JS
- Mongo DB (version mongo3)

## Readme Legend


## Schema
The following fields values can be set in your schema.

### Validation
- required (Boolean) - makes sure value is not undefined
- type (String|Number|Object|Boolean) (not Array - see Array schema below)
- default (String|Number|Object|Boolean|Array)
- denyXSS (Boolean) - returns false if given a string containing XSS (uses https://github.com/yahoo/xss-filters)

### Transformation
- trim (Boolean)
- lowercase (Boolean)
- sanitize (Boolean)
- transform (Function)

### Arrays (to specify that a field is an Array of values)
- isArray (Boolean)
- arrayMin (Number) {optional} - the minimum number of values
- arrayMax (Number) {optional} - the maximum number of values

### Array and required properties
required will ensure that an array has a length of one ([null]) would pass.

### required properties
null and undefined will fail if required is true.

### Array of Objects/Arrays and validation/transformation properties
Validation/transformaion of the interior arrays/objects can not occur (except for required - see above) using the cutom validate/transform methods.

### custom transformation/valdation method runs last.

### Examples
#### Normal schema
#### Nested schema
#### Mixed schema
#### Array of arrays schema
#### Array of objects schema


## Methods

## Async

## Indexes

# Errors

## Phase II
- add custom schema properties

## List supported data structures
- objects in arrays
- objects in objects
- strings in objects
- numbers in objects
- booleans in objects

- arrays of arrays (validation for values in array must be done custom)

#todos
- what to do if inserting/updating and the value is empty? right now we are running the query. probably shouldn't but what to return.

## no validate

## addKoa

## date
- type  == date
- dateFormat - ('unix', '8601', custom - see moment isValid docs). if false, will match all moment formats.
- uses moment in strict parsing mode.

## Init database
convience method.
