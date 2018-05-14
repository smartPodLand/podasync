(function() {
  /**
   * General Utilities
   */
  function Utility() {
    this.isNode = function() {
      return (typeof module !== 'undefined' && typeof module.exports != "undefined");
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports != "undefined") {
    module.exports = Utility;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.Utility = Utility;
  }
})();
