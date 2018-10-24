# FiremanQL syntax

## Base structure

A FiremanQL query in its basic form is a forward slash separated path string,
like the one used to access a Firebase Realtime Database location.

The following query will return the value of `baz`, being it a valid node in the Realtime or a document/collection in Firestore:

```
foo/bar/baz
```

## Identifiers

Literal parts of the path and identifiers in expressions cannot contain the following characters:
`/`, `{`, `}`, `[`, `]`, `,`, `^`, `_`, `=`, `<`, `>` and whitespaces. All of those characters except the forward slash can be used if the identifier is surrounded by single or double quotes:

```
foo/"b,a{r}"/['b^a_z' == 2]
```

## Collection expressions

Collection expressions can be included in the path, usually (but not necessarily) at the end, enclosed in square brackets:

```
foo/bar/[ /* Collection Expression */ ]
```

Colleciton expression host clauses like where, order by etc. depending on the target database.

## Where (Firestore only)

The where clause has the following shape:

```
<identifier> <operator> <value>
```

`<identifier>` is a valid Firestore document identifier.

`<operator>` is one of `==`, `<`, `>`, `<=`, `>=` (self-explanatory) and `has`, which corresponds to Firestore's [`array_contains`](https://firebase.google.com/docs/firestore/query-data/queries#array_membership).

`<value>` is either a single or double quoted string, a number, `true`, `false`, or `null`.

Consider the example data from Firestore's documentation:

```javascript
{
  cities: { // Collection
    SF: { // Document
      name: 'San Francisco',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 860000,
      regions: ['west_coast', 'norcal'],
    },
    LA: {
      name: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 3900000,
      regions: ['west_coast', 'socal']
    },
    DC: {
      name: 'Washington, D.C.',
      state: null,
      country: 'USA',
      capital: true,
      population: 680000,
      regions: ['east_coast'],
    },
    TOK: {
      name: 'Tokyo',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000,
      regions: ['kanto', 'honshu'],
    },
    BJ: {
      name: 'Beijing',
      state: null,
      country: 'China',
      capital: true,
      population: 21500000,
      regions: ['jingjinji', 'hebei'],
    },
  },
}

```

### Simple queries

The following query returns all cities with state CA:

```
cities/[state == 'CA']
```

The following query returns all the capital cities:

```
cities/[capital == true]
```

Other filters:

```
cities/[population < 1000000]
cities/[name >= 'San Francisco']
```

To filter based on array membership the `has` operator can be used:

```
cities/[regions has 'west_coast']
```

### Compound queries

More where conditions can be chained with commas:

```
cities/[state == 'CO', name == 'Denver']
```

> be sure to check the [limitations](https://firebase.google.com/docs/firestore/query-data/queries#compound_queries) on compound queries in the official documentation

## Document expressions

Document expressions can be used to restrict the queried documents to certain fields.

A document expression is a comma-separated list of valid document field keys surrounded in curly braces (a bit like JS destructuring declaration).

```
cities/[population < 1000000]/{name, state, country}
```

queries the cities with a population lower than 1000000 and for each of the retrieved documents only displays name, state and country fields.

> Note: when a document expression is used collections are not shown by default 