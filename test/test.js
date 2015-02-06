var dunnstreet = require( '../dunnstreet' );
var OpenDAP = dunnstreet;

var kettstreet = require( 'kettstreet' );

var allimaavenue = require( 'allimaavenue' );
var NetCDFParser = allimaavenue;

var fs = require( 'fs' );
var tape = require( 'tape' );
var zlib = require('zlib');
var util = require('util');

function kett( model ) {

  function parseQuery( value ) {
    if ( value ) {
      return value.split( "," ).map( function ( part ) {
        var parts = part.split( "[" );
        var name = parts[0];
        var range = [];
        for ( var i = 1, len = parts.length; i < len; i++ ) {
          range.push( parts[i].replace( "]", "" ).split( ":" ).map( function ( i ) {
            return parseInt( i );
          } ) );
        }
        return {
          name  : name,
          range : range
        }
      } );
    }
    else {
      return {}
    }
  }
  function arraybuffer( buffer ) {
    var ab = new ArrayBuffer( buffer.length );
    var ar = new Uint8Array( ab );
    var dv = new DataView( ab );
    for ( var i = 0; i < buffer.length; ++i ) {
      dv.setUint8( i, buffer.readUInt8( i ) );
    }
    return ab;
  }
  var opendap = new OpenDAP( { model : model, filename : '/data/test.nc'} );
  var provider = function ( url, callback ) {
    console.log( url );
    if ( url.match(/\.dds/) ) {
      callback( undefined, arraybuffer( opendap.dds() ) );
    } else if ( url.match(/\.das/) ) {
      callback( undefined, arraybuffer( opendap.das() ) );
    } else if ( url.match(/\.dods/) ) {
      var variables = parseQuery( url.substring( url.indexOf('?') + 1 ) );
      console.log( util.inspect( variables, false, 4 ) );
      callback( undefined, arraybuffer( opendap.dods( variables ) ) );
    }
  };
  return kettstreet( { url : "http://localhost/data/test.nc",
                       provider : provider} );

}

var parser = new NetCDFParser( { debug : false } );
parser.on( "end", function( model ) {
  kett( model ).dds( function ( err, data ) {
    tape( 'check dds', function ( test ) {
      test.plan( 5 );
      test.deepEquals( data.type, "Dataset" );
      test.deepEquals( data['T_SFC'].type, "Grid" );
      test.deepEquals( data['time'].type, "Int32" );
      test.deepEquals( data['latitude'].type, "Float32" );
      test.deepEquals( data['longitude'].type, "Float32" );
      test.end();
    } );
  } );
  kett( model ).dap( "T_SFC", "[0:1:1][0:1:1][0:1:1]",function ( err, data ) {
    tape( 'check t_sfc dods', function ( test ) {
      test.plan( 1 );
      test.deepEquals( data[0].das.type, "Grid" );
      test.end();
    } );
  } );
  kett( model ).dap( "time", "[0:1:1]",function ( err, data ) {
    tape( 'check time dods', function ( test ) {
      test.plan( 1 );
      test.deepEquals( data[0].das.type, "Int32" );
      test.end();
    } );
  } );
} );

var fs_options = { highWaterMark : Math.pow( 2, 26 ) };
fs.createReadStream( __dirname + '/data/test.nc', fs_options ).pipe( parser );
