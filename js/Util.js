var Util = {
  addClass: function(cl, el){
    if( el.className.trim() == '' || el.className.indexOf(cl) == -1 ){
      el.className += ' '+ cl;
    }
  },

  hasClass: function(cl, el){
    return el.className.split(' ').indexOf( cl.replace('.', '') ) > -1;
  },

  removeClass: function(cl, el){
    if( el.className.trim() != '' && el.className.indexOf(cl) > -1 ){
      el.className = el.className.replace( new RegExp('\\s?'+ cl), '' );
    }
  },

  closest: function(cl, el){
    cl = cl.replace('.', '');

    while( el.parentNode ){
      el = el.parentNode;

      if( Util.hasClass(cl, el) ){
        return el;
        break;
      }
    }

    return false;
  },

  newDomElement: function(str){
    var wrapper = document.createElement('div');
    wrapper.innerHTML = str;
    return wrapper.childNodes;
  },

  replaceElement: function(oldEl, newEl){
    if( newEl && newEl.length && newEl.length === 1 ) newEl = newEl[0];

    if( newEl && newEl.length ){
      for( var i=0; i<newEl.length; i++ ){
        oldEl.parentNode.insertBefore(newEl[i], oldEl.nextSibling);
      }
    }else{
      oldEl.parentNode.insertBefore(newEl, oldEl.nextSibling);
    }

    oldEl.parentNode.removeChild(oldEl);

    return newEl;
  },

  ajax: function(opts){
    var req = new XMLHttpRequest();
    var reqType = (opts.type || opts.form.method).toUpperCase();
    var reqURL = opts.url || opts.form.action;
    var reqData = buildFormData();

    if( reqType == 'GET' ){
      reqURL += (( reqURL.indexOf('?') > -1 ) ? '&' : '?') + reqData;
    }

    function addObjectData(data, formData){
      var buildStr = !formData;

      if( buildStr ) formData = [];

      for( var key in data ){
        if( data.hasOwnProperty(key) ){

          var dat = data[key];

          if( dat instanceof Array ){
            for( var i=0; i<dat.length; i++ ){
              var item = ( dat[i] instanceof Object || dat[i] instanceof Array ) ? JSON.stringify(dat[i]) : dat[i];

              if( buildStr ) formData.push( key +'[]='+ item );
              else formData.append( key+'[]', item );
            }
          }else if( dat instanceof Object ){
            if( buildStr ) formData.push( key +'='+ JSON.stringify(dat) );
            else formData.append( key, JSON.stringify(dat) );
          }else{
            if( buildStr ) formData.push( key +'='+ dat );
            else formData.append( key, dat );
          }
        }
      }

      if( buildStr ){
        return formData.join('&');
      }
    }

    function buildFormData(){
      var formData;

      if( reqType == 'GET' ){
        formData = '';
      }else{
        if( opts.form && !opts.formData ){
          formData = new FormData( opts.form );
        }else if( opts.formData ){
          formData = opts.formData;
        }else{
          formData = new FormData();
        }
      }

      if( opts.data ){
        if( typeof formData == 'string' ) formData = addObjectData(opts.data);
        else addObjectData(opts.data, formData);
      }

      return formData;
    }

    var promise = new Promise(function(resolve, reject){

      req.open( reqType, reqURL, true );

      if( opts.onProgress ){
        req.upload.addEventListener('progress', function(ev){
          var uploadProgress = (ev.loaded / ev.total) * 100;
          opts.onProgress( uploadProgress );

          if( uploadProgress == 100 ){
            if( opts.onProgressComplete ) opts.onProgressComplete();
          }
        }, false);
      }

      req.onreadystatechange = function(){
        if( req.readyState == 4 ){
          var resp;

          if( req.status == 200 ){
            try{
              resp = JSON.parse(req.responseText);
            }catch( error ){
              resp = req.responseText;
            }

            resolve( resp );
            if( opts.onSuccess ) opts.onSuccess( resp );
          }else{
            try{
              resp = JSON.parse(req.responseText);
            }catch( error ){
              resp = req.responseText;
            }

            reject( resp );
            if( opts.onError ) opts.onError( resp, req.status, req.statusText );
          }
        }
      };

      if( reqType == 'GET' ) req.send();
      else req.send( reqData );
    });

    return promise;
  }
};