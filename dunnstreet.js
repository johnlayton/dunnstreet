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

  var Dunnstreet = (function () {

    var Dunnstreet = function ( options ) {
      this.options = options;
    };

    Dunnstreet.prototype.clear = function () {
    };


    return Dunnstreet;
  })();

  return function ( options ) {
    return new Dunnstreet( options );
  };

} ));