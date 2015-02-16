## Travis CI DunnStreet
[![Build Status](https://travis-ci.org/johnlayton/dunnstreet.png?branch=master)](https://travis-ci.org/johnlayton/dunnstreet)

Model Head ...
```javascript
{ title: 'CDF',
  version: 1,
  records: 0,
  dimensions:
   [ { name: 'time', size: 164 },
     { name: 'latitude', size: 292 },
     { name: 'longitude', size: 341 } ],
  attributes:
   [ { name: 'creationTime', type: 4, value: { '0': 1422469761 } },
     { name: 'creationTimeString',
       type: 2,
       value: '2015-01-28T18:29:21.966747Z' },
     { name: 'Conventions', type: 2, value: 'COARDS' } ],
  variables:
   [ { name: 'T_SFC',
       type: 5,
       size: 65319232,
       offset: 836,
       dimensions:
        [ { name: 'time', size: 164 },
          { name: 'latitude', size: 292 },
          { name: 'longitude', size: 341 } ],
       attributes:
        [ { name: 'gridType', type: 2, value: 'SCALAR' },
          { name: '_FillValue', type: 5, value: { '0': -32767 } },
          { name: 'missing_value', type: 5, value: { '0': -32767 } },
          { name: 'long_name', type: 2, value: 'Surface Temperature' },
          { name: 'valid_min', type: 5, value: { '0': -20 } },
          { name: 'valid_max', type: 5, value: { '0': 60 } },
          { name: 'units', type: 2, value: 'C' },
          { name: 'projectionType', type: 2, value: 'LATLONG' } ] },
     { name: 'latitude',
       type: 5,
       size: 1168,
       offset: 65320068,
       dimensions: [ { name: 'latitude', size: 292 } ],
       attributes:
        [ { name: 'units', type: 2, value: 'degrees_north' },
          { name: 'long_name', type: 2, value: 'latitude of grid cell' } ] },
     { name: 'longitude',
       type: 5,
       size: 1364,
       offset: 65321236,
       dimensions: [ { name: 'longitude', size: 341 } ],
       attributes:
        [ { name: 'units', type: 2, value: 'degrees_east' },
          { name: 'long_name', type: 2, value: 'longitude of grid cell' } ] },
     { name: 'time',
       type: 4,
       size: 656,
       offset: 65322600,
       dimensions: [ { name: 'time', size: 164 } ],
       attributes:
        [ { name: 'units',
            type: 2,
            value: 'seconds since 1970-01-01 00:00:00' } ] } ] }
```

Model Data ...
```javascript
{ variables:
   [ { variable: [Object], shape: [Object], type: 5, data: [Object] },
     { variable: [Object], shape: [Object], type: 5, data: [Object] },
     { variable: [Object], shape: [Object], type: 5, data: [Object] },
     { variable: [Object], shape: [Object], type: 4, data: [Object] } ] }
```
