(function ( root, factory ) {
  if ( typeof exports === 'object' ) {
    module.exports = factory();
  }
  else if ( typeof define === 'function' && define.amd ) {
    define( [], factory );
  }
  else {
    createOpenDap = factory();
  }
}( this, function () {

  var util = require( 'util' );
  var cwise = require("cwise");

  var Dunnstreet = (function () {

    const NC_BYTE = 0x01;
    const NC_CHAR = 0x02;
    const NC_SHORT = 0x03;
    const NC_INT = 0x04;
    const NC_FLOAT = 0x05;
    const NC_DOUBLE = 0x06;
    const NC_STRING = 0xFF;

    function concat() {
      return Array.prototype.slice.call(arguments ).join( '\n' );
    }

    function select( arr, ranges ) {
      var lo = ranges.map( function( item ) { return Math.max( ( item[0] - 1 ), 0 ) ; } );
      var hi = ranges.map( function( item ) { return Math.max( ( item[2] - ( item[0] - 1 ) ), 1 ); } );
      var st = ranges.map( function( item ) { return item[1]; } );
      var body = "return arr" +
                 ".lo( " + lo.join( ',' ) + " )" +
                 ".hi( " + hi.join( ',' ) + " )" +
                 ".step( " + st.join( ',' ) + " )" +
                 ";";
      var func = new Function("arr", body);
      return func( arr );
    }

    function dataFor( variable, model ) {
      var data = find( model.data.variables, function ( v ) {
        return v.variable.name == variable.name;
      } ).data;
      data = (variable.range && variable.range.length > 0) ? select( data, variable.range ) : data;
      return data;
    }

    function asciiData( arr ) {
      var to_buffer = cwise({
        printCode : false,
        args: ["array", "index"],
        pre: function() {
          this.buffer = "";
        },
        post: function() {
          return this.buffer
        },
        body: function to_buffer(val, idx) {
          if ( idx[ idx.length - 1 ] == 0  ) {
            this.buffer = this.buffer + '\\n';
            if ( idx.length > 1 ) {
              this.buffer = this.buffer + "[" + idx.slice( 0, idx.length - 1 ).join( "][" ) + "], ";
            }
            this.buffer = this.buffer + val.toString();
          } else {
            this.buffer = this.buffer + ", " + val.toString();
          }
        }
      });
      return to_buffer( arr );
    }

    function dodsData( arr ) {
      function toBuffer(d) {
        if ( d.size > 0 ) {
          if ( d.dtype == "int32" ) {
            var buffer = new Buffer( 8 + ( d.size * 4 ) );
            buffer.writeUInt32BE( d.size, 0 );
            buffer.writeUInt32BE( d.size, 4 );
            var to_buffer = cwise({
              printCode : false,
              args: ["array", "scalar"],
              body: function to_buffer(val, buffer) {
                this.position = this.position || 8;
                buffer.writeInt32BE( val, this.position );
                this.position = this.position + 4;
              }
            });
            to_buffer(d, buffer);
            return buffer;
          } else if ( d.dtype == "float32" ) {
            var buffer = new Buffer( 8 + ( d.size * 4 ) );
            buffer.writeUInt32BE( d.size, 0 );
            buffer.writeUInt32BE( d.size, 4 );
            var to_buffer = cwise( {
               printCode : false,
               args : ["array", "scalar"],
               pre: function() {
                 this.count = 0;
               },
               post: function() {
                 return this.count
               },
               body : function to_buffer( val, buffer ) {
                 this.position = this.position || 8;
                 this.count += 1;
                 buffer.writeFloatBE( val, this.position );
                 this.position = this.position + 4;
               }
             } );
            var i = to_buffer( d, buffer );
            return buffer;
          }
          else {
            //console.log( "###########" );
            //console.log( "MISSED : " + arr.dtype );
            //console.log( "###########" );
          }
          return buffer;
        } else {
          return new Buffer(0);
        }
      }
      return toBuffer( arr );
    }

    function find( arr, callback ) {
      for ( var i = 0, len = arr.length; i < len; i++ ) {
        if ( callback( arr[i] ) ) {
          return arr[i];
        }
      }
      return null;
    }

    function describeType( i ) {
      switch ( i ) {
        case NC_INT:
          return "Int32";
        case NC_FLOAT:
          return "Float32";
        case NC_STRING:
        case NC_CHAR:
          return "String";
        default:
          return "";
      }
    }

    function describeValue( i, v ) {
      switch ( i ) {
        case NC_BYTE:
        case NC_SHORT:
        case NC_INT:
        case NC_DOUBLE:
          return v;
        case NC_FLOAT:
          return v[0];
        case NC_CHAR:
        case NC_STRING:
          return "\"" + v + "\"";
        default:
          return "";
      }
    }

    function describeAttribute( attribute ) {
      var type = describeType( attribute.type );
      var name = attribute.name;
      var value = describeValue( attribute.type, attribute.value );
      return type + " " + name + " " + value + ";"
    }

    function describeMultiDimensionalVariable( variable, size ) {
      var type = describeType( variable.type );
      var name = variable.name;
      var dims = variable.dimensions.map( function ( dim ) {
        return "[" + dim.name + " = " + ( size ? size[dim.name] || dim.size : dim.size ) + "]"
      } ).join( "" );
      return type + " " + name + dims + ";"
    }

    function describeSingleDimensionalVariable( variable, size ) {
      var type = describeType( variable.type );
      var name = variable.name;
      var dim  = variable.dimensions[0];
      var dims = "[" + dim.name + " = " + ( size || dim.size ) + "]"
      return type + " " + name + dims + ";"
    }

    function describeGriddedVariable( variable, model ) {
      var grid = "Grid {";
      grid = concat( grid, "ARRAY:" );
      grid = concat( grid, describeMultiDimensionalVariable( variable ) );
      grid = concat( grid, "MAPS:" );
      var dimensions = variable.dimensions;
      for ( var i = 0, len = dimensions.length; i < len; i++ ) {
        var name = dimensions[i].name;
        var size = dimensions[i].size;
        grid = concat( grid, describeSingleDimensionalVariable( find( model.head.variables, function ( a ) {
          return a.name == name;
        } ), size ) );
      }
      grid = concat( grid, "} " + variable.name + ";" );
      return grid;
    }

    function describeVariable( variable, model ) {
      if ( variable.dimensions.length > 1 ) {
        return describeGriddedVariable( variable, model );
      }
      else {
        return describeSingleDimensionalVariable( variable );
      }
    }

    function dodsForSingleVariable( variable, model ) {
      return dodsData( dataFor( variable, model ) );
    }

    function dodsForGriddedVariable( variable, model ) {
      data = dodsForSingleVariable( variable, model );
      var dimensions = find( model.head.variables, function ( v ) {
        return v.name == variable.name;
      } ).dimensions;
      for ( var i = 0, len = dimensions.length; i < len; i++ ) {
        var tmpvar = {
          name  : dimensions[i].name,
          range : [variable.range[i]]
        };
        data = Buffer.concat( [ data, dodsForSingleVariable( tmpvar, model ) ] );
      }
      return data;
    }

    function dodsForVariable( variable, model ) {
      var dimensions = find( model.head.variables, function ( v ) {
        return v.name == variable.name;
      } ).dimensions;
      if ( dimensions.length > 1 ) {
        return dodsForGriddedVariable( variable, model );
      }
      else {
        return dodsForSingleVariable( variable, model );
      }
    }

    function asciiForSingleVariable( variable, model ) {
      var data = dataFor( variable, model )
      var text = new Buffer( variable.name + "[" + data.shape.slice( 0, data.shape.length ).join( "][" ) + "]" );
      return Buffer.concat( [ text, new Buffer( asciiData( data ) + "\n\n" ) ] );
    }

    function asciiForGriddedVariable( variable, model ) {
      var data = Buffer.concat( [ new Buffer(variable.name + "."), asciiForSingleVariable( variable, model ) ] );
      var dimensions = find( model.head.variables, function ( v ) {
        return v.name == variable.name;
      } ).dimensions;
      for ( var i = 0, len = dimensions.length; i < len; i++ ) {
        var tmpvar = {
          name  : dimensions[i].name,
          range : [variable.range[i]]
        };
        data = Buffer.concat( [ data,  new Buffer(variable.name + "."), asciiForSingleVariable( tmpvar, model ) ] );
      }
      return data;
    }

    function asciiForVariable( variable, model ) {
      var dimensions = find( model.head.variables, function ( v ) {
        return v.name == variable.name;
      } ).dimensions;
      if ( dimensions.length > 1 ) {
        return asciiForGriddedVariable( variable, model );
      }
      else {
        return asciiForSingleVariable( variable, model );
      }
    }

    var Dunnstreet = function ( options ) {
      this.options = options;
    };

    Dunnstreet.prototype.dds = function ( variables ) {
      var dds = "Dataset {";

      if ( variables && variables.length > 0 ) {
        for ( var i = 0, len = variables.length; i < len; i++ ) {

          var name = variables[i].name;
          var variable = find( this.options.model.head.variables, function ( a ) {
            return a.name == name;
          } );

          var range = variables[i].range;
          var dimensions = [];
          for ( var j = 0, l2 = variable.dimensions.length; j < l2; j++ ) {
            if ( range[j] && range[j].length == 3 ) {
              var dim = {
                name: variable.dimensions[j].name,
                size: Math.max( Math.ceil( ( range[j][2] - ( range[j][0] - 1 ) ) / range[j][1] ), 1 )
              };
              dimensions.push( dim );
            } else {
              dimensions.push( variable.dimensions[j] );
            }
          }
          var clone = {
            type: variable.type,
            name: variable.name,
            dimensions: dimensions
          };

          dds = concat( dds, "    " + describeVariable( clone, this.options.model ) );
        }
      } else {
        var variables = this.options.model.head.variables;
        for ( var j = 0, l2 = variables.length; j < l2; j++ ) {
          dds = concat( dds, "    " + describeVariable( variables[j], this.options.model ) );
        }
      }

      dds = concat( dds, "} " + ( this.options.filename || '' ) + ";" );
      return new Buffer( dds );
    };

    Dunnstreet.prototype.das = function () {
      var das = "Attributes {";
      var variables = this.options.model.head.variables;
      for ( var i = 0, l1 = variables.length; i < l1; i++ ) {
        var variable = variables[i];
        das = concat( das, "    " + variable.name + " {" );
        if (  variable.attributes ) {
          for ( var j = 0, l2 = variable.attributes.length; j < l2; j++ ) {
            das = concat( das, "        " + describeAttribute( variable.attributes[j] ) );
          }
        }
        das = concat( das, "    }" );
      }
      if ( this.options.model.head.attributes && this.options.model.head.attributes.length > 0 ) {
        das = concat( das, "    NC_GLOBAL {" );
        for ( var k = 0, l3 = this.options.model.head.attributes.length; k < l3; k++ ) {
          das = concat( das, "        " + describeAttribute( this.options.model.head.attributes[k] ) );
        }
        das = concat( das, "    }" );
      }
      das = concat( das, "}" );
      return new Buffer( das );
    };

    Dunnstreet.prototype.dods = function ( variables ) {
      var dap = this.dds( variables );
      dap = Buffer.concat( [ dap, new Buffer( "\nData:\n" ) ] );
      for ( var i = 0, len = variables.length; i < len; i++ ) {
        dap = Buffer.concat( [ dap, dodsForVariable( variables[i], this.options.model )  ] );
      }
      return dap
    };

    Dunnstreet.prototype.ascii = function ( variables ) {
      var dap = this.dds( variables );
      dap = Buffer.concat( [ dap, new Buffer( "\n---------------------------------------------\n" ) ] );
      for ( var i = 0, len = variables.length; i < len; i++ ) {
        dap = Buffer.concat( [ dap, asciiForVariable( variables[i], this.options.model )  ] );
      }
      return dap;
    };

    return Dunnstreet;
  })();

  return function ( options ) {
    return new Dunnstreet( options );
  };

} ));
