function VideoConverter(opts){
  /**
   * Prefix logging statements to easily differentiate between
   * other logging on the page.
   * @type {string}
   */
  this.logPrefix = '[ VID CONVERTER ] - ';
  /**
   * The label for the file upload drop-zone.
   * @type {string}
   */
  this.defaultDropZoneText = 'DROP FILE HERE';
  /**
   * Each JS selector is prefixed per the Class so as
   * not to conflict with any other Classes on the page.
   * @type {string}
   */
  this.jsPrefix = '.js-';
  /**
   * A map of JS selectors used to access the DOM.
   * @type {Object}
   */
  this.selectors = {
    CONVERTER_FORM: this.jsPrefix +'converterForm',
    FILE_INPUT: this.jsPrefix +'fileInput',
    DROP_ZONE: this.jsPrefix +'fileDropZone',
    DROP_ZONE_CONTENT: this.jsPrefix +'fileDropZoneContent',
    UPLOAD_BTN: this.jsPrefix +'uploadBtn',
    CONVERT_BTN: this.jsPrefix +'convertBtn',
    SCREEN_GRAB_CONTAINER: this.jsPrefix +'screenGrabContainer',
    CONVERTER_INPUTS: this.jsPrefix +'converterInputs',
    CONVERTER_PROGRESS_TIMER: this.jsPrefix +'converterProgressTimer',
    CONVERTER_PROGRESS_BAR: this.jsPrefix +'converterProgressBar',
    CONVERTER_PROGRESS_BAR_CONTAINER: this.jsPrefix +'converterProgressBarContainer',
    CONVERTER_PROGRESS_LOG: this.jsPrefix +'converterProgressLog',
    PROGRESS_LOG_CONTENT: this.jsPrefix +'progressLogContent',
    CONVERTER_PROGRESS_ITEM: this.jsPrefix +'converterProgressItem',
    CONVERTER_PROGRESS_ITEM_LABEL: this.jsPrefix +'converterProgressItemLabel',
    CONVERSION_PROGRESS_BAR: this.jsPrefix +'conversionProgressBar',
    VIDEO_WRAPPER: this.jsPrefix +'videoWrapper',
    VIDEO_FOR_SCREEN_GRAB: this.jsPrefix +'videoForScreenGrab',
    GRAB_FRAME_BTN: this.jsPrefix +'grabFrameBtn',
    LOAD_VIDEO_BTN: this.jsPrefix +'loadVideoBtn',
    VIDEO_SCRUBBER: this.jsPrefix +'videoScrubber',
    VIDEO_SCRUBBER_TIME: this.jsPrefix +'videoScrubberTime',
    VIDEO_PLAYER: this.jsPrefix +'videoPlayer',
    VIDEO_PLAYER_POSTER_BTN: this.jsPrefix +'videoPlayerPosterBtn'
  };
  /**
   * A map of CSS modifiers used to alter the DOM.
   * @type {Object}
   */
  this.cssModifiers = {
    IS_INVISIBLE: 'is--invisible',
    IS_HIDDEN: 'is--hidden',
    HAS_FILE: 'has--file',
    DROP_ZONE_HOVER: 'drop-it-like-its-hot'
  };
  /**
   * A map of commonly used DOM elements.
   * @type {Object}
   */
  this.els = {};
  /**
   * The localStorage key used to maintain conversion state.
   * @type {string}
   */
  this.cacheKey = 'vidConverter';
  /**
   * The framerate of the converted videos.
   * @type {number}
   */
  this.FPS = 30;
  /**
   * This is used to increment jobs during a batch conversion.
   * @type {number}
   */
  this.logIndex = 0;
  /**
   * A map of data set after each conversion job is completed.
   * @type {Object}
   */
  this.convertedFiles = {};
  /**
   * A filtered list of files that will be uploaded/converted.
   * @type {Array}
   */
  this.uploadList = [];
  /**
   * Keeps track of the size of all uploads so it can be compared
   * against what the server can handle.
   * @type {number}
   */
  this.uploadSize = 0;
  /**
   * The upload capabilities of the server.
   * @type {Object}
   */
  this.uploadCapabilities = {};
  /**
   * An `interval` that keeps track of how much time has passed
   * during a conversion job.
   * @type {undefined|number}
   */
  this.conversionTimer = undefined;
  /**
   * Keeps track of what files have been added via a drop-zone
   * for uploads.
   * @type {undefined|Object}
   */
  this.formData = undefined;
  /**
   * A timestamp from an `input` or `change`. Used to verify
   * events don't fire twice in some instances.
   * @type {undefined|number}
   */
  this.scrubTimeStamp = undefined;
  /**
   * A DOM selector used to find an element on the page that
   * you want to replace with a video converter.
   * @type {string|undefined}
   */
  this.placeholder = opts.placeholder || undefined;
  /**
   * The width of the converted videos. If only a width is set
   * then the height will scale to maintain the original aspect
   * ratio.
   * @type {undefined|number}
   */
  this.finalVideoWidth = opts.finalVideoWidth || ( (!opts.finalVideoHeight) ? 640 : undefined );
  /**
   * The height of the converted videos. If only a height is set
   * then the width will scale to maintain the original aspect
   * ratio.
   * @type {undefined|number}
   */
  this.finalVideoHeight = opts.finalVideoHeight || undefined;
  /**
   * The base markup for the converter.
   * @type {string}
   */
  this.template =
    '<div class="converter">'
      +'<form class="converter__form js-converterForm" action="php/api.php" method="POST" enctype="multipart/form-data">'
        +'<div class="file-drop-zone js-fileDropZone">'
          +'<div class="converter__ui">'
            +'<div class="converter__ui-wrapper">'
              +'<div class="converter__inputs js-converterInputs">'
                +' <input type="file" name="videoFile[]" class="base-input converter__file-input js-fileInput" multiple>'
                +' <button type="submit" class="base-input converter__upload-btn js-uploadBtn" value="upload" disabled>Upload</button>'
                +' <button type="button" class="base-input converter__convert-btn is--hidden js-convertBtn" value="convert" disabled>Convert</button>'
              +'</div>'
              +'<div class="converter__progress-bar-container is--invisible js-converterProgressBarContainer">'
                +'<progress class="converter__progress-bar js-converterProgressBar" max="100" value="0"></progress>'
              +'</div>'
            +'</div>'
          +'</div>'
          +'<div class="converter__progress-log is--hidden js-converterProgressLog">'
            +'<div class="converter__progress-log__content js-progressLogContent"></div>'
          +'</div>'
          +'<div class="converter__progress-item is--invisible js-converterProgressItem">'
            +'<div class="converter__progress-timer js-converterProgressTimer" data-file-count="(0 of 0)" data-elapsed-time="00:00"></div>'
            +'<div class="converter__progress-item__label js-converterProgressItemLabel"></div>'
            +'<progress class="converter__progress-item__conversion-progress js-conversionProgressBar" min="0" max="100" value="0"></progress>'
          +'</div>'
        +'</div>'
      +'</form>'
      +'<div class="screen-grab__container is--hidden js-screenGrabContainer"></div>'
    +'</div>';

  if(
    this.apiCheck()
    && this.placeholder
  ){
    var placeholder = document.querySelector(this.placeholder);

    if( placeholder ){
      this.els.converter = Util.replaceElement(placeholder, Util.newDomElement( this.template ));
      this.els.converterForm = this.els.converter.querySelector( this.selectors.CONVERTER_FORM );
      this.els.progressTimerEl = this.els.converter.querySelector( this.selectors.CONVERTER_PROGRESS_TIMER );
      this.els.progressBar = this.els.converter.querySelector( this.selectors.CONVERTER_PROGRESS_BAR );
      this.els.progressBarContainer = this.els.converter.querySelector( this.selectors.CONVERTER_PROGRESS_BAR_CONTAINER );
      this.els.progressLog = this.els.converter.querySelector( this.selectors.CONVERTER_PROGRESS_LOG );
      this.els.progressLogContent = this.els.converter.querySelector( this.selectors.PROGRESS_LOG_CONTENT );
      this.els.converterInputs = this.els.converter.querySelector( this.selectors.CONVERTER_INPUTS );
      this.els.progressItem = this.els.converter.querySelector( this.selectors.CONVERTER_PROGRESS_ITEM );
      this.els.progressItemLabel = this.els.converter.querySelector( this.selectors.CONVERTER_PROGRESS_ITEM_LABEL );
      this.els.conversionProgressBar = this.els.converter.querySelector( this.selectors.CONVERSION_PROGRESS_BAR );
      this.els.fileInput = this.els.converter.querySelector( this.selectors.FILE_INPUT );
      this.els.convertBtn = this.els.converter.querySelector(this.selectors.CONVERT_BTN );
      this.els.uploadBtn = this.els.converter.querySelector( this.selectors.UPLOAD_BTN );
      this.els.dropZone = this.els.converter.querySelector( this.selectors.DROP_ZONE );
      this.els.screenGrabContainer = this.els.converter.querySelector( this.selectors.SCREEN_GRAB_CONTAINER );

      this.getUploadCapabilities();
    }
  }
}

VideoConverter.prototype = {
  /**
   * Highlights the drop-zone so users know they can drop the file.
   *
   * @param {Event} ev - DragEnter
   */
  handleDZEnter: function(ev){
    ev.preventDefault();

    Util.addClass(this.cssModifiers.DROP_ZONE_HOVER, ev.target);
  },

  /**
   * Prevents text selection.
   *
   * @param {Event} ev - DragOver
   */
  handleDZOver: function(ev){
    ev.preventDefault();
  },

  /**
   * Removes the drop-zone highlight.
   *
   * @param {Event} ev - DragLeave
   */
  handleDZEnd: function(ev){
    ev.preventDefault();

    Util.removeClass(this.cssModifiers.DROP_ZONE_HOVER, ev.target);
  },

  /**
   * Adds to the list of items to upload.
   *
   * @param {Event} ev - Drop
   */
  handleDZDrop: function(ev){
    ev.preventDefault();

    var files = ev.dataTransfer.files;

    this.els.fileInput.value = '';
    this.els.fileInput.disabled = true; // so it doesn't get added to the Array as empty.
    if( !this.formData ) this.formData = new FormData( this.els.converterForm );
    this.els.fileInput.disabled = false;

    Util.removeClass(this.cssModifiers.DROP_ZONE_HOVER, this.els.dropZone);
    this.updateUploadList(files);
  },

  /**
   * The user used the `file` input to add files for upload.
   *
   * @param {Event} ev - Change
   */
  handleDZInputChange: function(ev){
    this.formData = null;

    this.updateUploadList(ev.target.files);
  },

  /**
   * Uploads the files the user added.
   *
   * @param {Event} ev - Submit
   */
  handleFormSubmit: function(ev){
    ev.preventDefault();

    var _self = this;
    var conf = {
      type: this.els.converterForm.method,
      url: this.els.converterForm.action,
      data: {
        action: 'uploadVideos'
      },
      form: this.els.converterForm,
      onProgress: function(val){
        _self.els.progressBar.value = val;
      },
      onProgressComplete: function(){
        _self.hideUploadProgress();
      },
      onSuccess: function(resp){
        console.log( _self.logPrefix + resp.msg );
        localStorage[ _self.cacheKey ] = JSON.stringify(resp);
        _self.enableConverter();
      },
      onError: function(resp){
        alert( resp.msg );
      }
    };

    // include file(s) if added via drop
    if( !!this.formData ){
      delete conf.form;
      conf.formData = this.formData;
    }

    Util.ajax(conf);

    this.showUploadProgress();
  },

  /**
   * Updates the text for the drop-zone.
   *
   * @param {string} text - The new text.
   */
  updateDropZoneText: function(text){
    this.els.dropZone.dataset.dzText = text;
  },

  /**
   * Resets the drop-zone text to the default.
   */
  resetDropZoneText: function(){
    this.els.dropZone.dataset.dzText = this.defaultDropZoneText;
  },

  /**
   * Enables the converter.
   *
   * @param {boolean} onLoad - Whether or not it's being called during load
   * of the page.
   */
  enableConverter: function(onLoad){
    var s = '';
    var separator = "\n  - ";

    // enabling on doc load, so set everything else up
    // that normally gets set during the initial upload phase.
    if( onLoad ){
      var data = localStorage[this.cacheKey];
      if( data ) data = JSON.parse( data );

      for( var i=0; i<data.uploadedFiles.length; i++ ){
        var file = data.uploadedFiles[i];

        this.uploadList.push(file.name +'.'+ file.ext);
      }

      if( this.uploadList.length > 1 ) s = 's';
      this.updateDropZoneText( 'File'+ s +' may still be converting'+ separator + this.uploadList.join(separator) );
      Util.addClass(this.cssModifiers.HAS_FILE, this.els.dropZone);
      this.els.convertBtn.dataset.startText = this.els.convertBtn.innerText;
      this.els.convertBtn.innerText = 'Check Status';
    }else{
      if( this.uploadList.length > 1 ) s = 's';
      this.updateDropZoneText( 'File'+ s +' to be converted'+ separator + this.uploadList.join(separator) );
    }

    this.els.fileInput.disabled = true;
    Util.addClass( this.cssModifiers.IS_HIDDEN, this.els.fileInput );
    this.els.uploadBtn.disabled = true;
    Util.addClass( this.cssModifiers.IS_HIDDEN, this.els.uploadBtn );
    this.els.convertBtn.disabled = false;
    Util.removeClass( this.cssModifiers.IS_HIDDEN, this.els.convertBtn );
  },

  /**
   * Disables the converter.
   */
  disableConverter: function(){
    Util.removeClass(this.cssModifiers.HAS_FILE, this.els.dropZone);
    if( this.els.convertBtn.dataset.startText )
      this.els.convertBtn.innerText = this.els.convertBtn.dataset.startText;

    this.els.fileInput.disabled = false;
    Util.removeClass( this.cssModifiers.IS_HIDDEN, this.els.fileInput );
    this.els.uploadBtn.disabled = false;
    Util.removeClass( this.cssModifiers.IS_HIDDEN, this.els.uploadBtn );
    this.els.convertBtn.disabled = true;
    Util.addClass( this.cssModifiers.IS_HIDDEN, this.els.convertBtn );
  },

  /**
   * Keeps the upload list clean by filtering out non-video files,
   * making sure the file hasn't already been added, and checks the
   * total upload size against what the server can handle. If the upload
   * size is larger than what the server can handle the user will be
   * alerted.
   *
   * @param {Array} files - An Array of file Objects.
   */
  updateUploadList: function(files){
    var s = '';
    var separator = "\n  - ";

    // only add unique items
    for( var i=0; i<files.length; i++ ){
      var file = files[i];

      if(
        // file is a video
        file.type.indexOf('video/') > -1
        // file hadn't already been added
        && this.uploadList.indexOf(file.name) == -1
      ){
        var newSize = this.uploadSize + (file.size / 1024 / 1024);

        // only add files if the server can handle them
        if( newSize >= this.uploadCapabilities.maxUploadSize.int ){
          var errorMsg =
            "The server only allows `"+ this.uploadCapabilities.maxUploadSize.value +"` to be uploaded per request."
            +"\n As of file `"+ file.name +"` you're at `"+ newSize.toFixed(2) +"M`."
            +"\n You can increase the upload limit within the `.htaccess` file.";

          alert(errorMsg);
          break;
        }else{
          // only append if file(s) were dropped
          if( !!this.formData ) this.formData.append(this.els.fileInput.name, file);
          this.uploadList.push(file.name);
          this.uploadSize = newSize;
          if( this.uploadList.length > 1 ) s = 's';

          this.updateDropZoneText( 'File'+ s +' to upload'+ separator + this.uploadList.join(separator) );
          this.els.uploadBtn.disabled = false;
          Util.addClass(this.cssModifiers.HAS_FILE, this.els.dropZone);
        }
      }
    }
  },

  /**
   * Shows the upload progress bar.
   */
  showUploadProgress: function(){
    Util.addClass( this.cssModifiers.IS_INVISIBLE, this.els.converterInputs );
    Util.removeClass( this.cssModifiers.IS_INVISIBLE, this.els.progressBarContainer );
  },

  /**
   * Hides the upload progress bar.
   */
  hideUploadProgress: function(){
    Util.addClass( this.cssModifiers.IS_INVISIBLE, this.els.progressBarContainer );
    Util.removeClass( this.cssModifiers.IS_INVISIBLE, this.els.converterInputs );
  },

  /**
   * Removes specified log files from the server after video conversion
   * has completed.
   *
   * @param {Array} logFiles - An Array of log file names that will be
   * removed.
   */
  removeLogs: function(logFiles){
    var _self = this;

    Util.ajax({
      type: 'POST',
      url: 'php/api.php',
      data: {
        action: 'removeLogs',
        logFiles: logFiles
      },
      onSuccess: function(resp){
        console.log( _self.logPrefix + resp.msg );
      },
      onError: function(resp){
        alert( resp.msg );
      }
    });
  },

  /**
   * Renders the text of the conversion log out to the DOM.
   *
   * @param {Object} log - Various data about the video conversion.
   */
  renderConversionLog: function(log){
    // print the full log out to the DOM
    this.els.progressLogContent.innerHTML = log.fullLog;
    this.els.progressLogContent.scrollTop = this.els.progressLogContent.scrollHeight;

    this.els.progressItemLabel.innerText = log.files[log.currentFile-1];
    this.els.conversionProgressBar.value = log.percentageComplete;
    this.els.progressTimerEl.dataset.fileCount = '( '+log.currentFile+' of '+log.totalFiles+' )';
  },

  /**
   * Takes a time from the video conversion log, and parses it
   * into it's millisecond value.
   *
   * @param {string} str - A time from the video conversion log.
   * @returns {number}
   */
  parseTimecode: function(str){
    // hours | minutes | seconds | milliseconds
    var time = str.split(/:|\./g);
    var millisecond = 1000;
    var milli = +time[3] * millisecond;
    var secs = +time[2] * (60 * millisecond);
    var mins = +time[1] * (60 * (60 * millisecond));
    var hrs = +time[0] * (60 * (60 * (60 * millisecond)));

    return hrs + mins + secs + milli;
  },

  /**
   * Resets the uploader back to the state it starts in during app
   * initialization.
   */
  resetUploader: function(){
    this.disableConverter();
    this.resetDropZoneText();

    this.els.fileInput.value = '';
    this.els.uploadBtn.disabled = true;
    this.formData = null;
    this.logIndex = 0;
    this.convertedFiles = {};
    this.uploadList = [];
    this.uploadSize = 0;
  },

  /**
   * Resets parts of the app and loads the converted videos so the
   * user can grab a screenshot of a video.
   *
   * @param {Array} logFiles - An Array of log files.
   */
  handleConversionCompletion: function(logFiles){
    Util.addClass(this.cssModifiers.IS_HIDDEN, this.els.progressLog);
    Util.addClass(this.cssModifiers.IS_INVISIBLE, this.els.progressItem);
    this.stopConversionTimer();
    localStorage.removeItem(this.cacheKey);
    this.removeLogs(logFiles);

    var files = [];
    var fileNames = Object.keys( this.convertedFiles );

    for( var i=0; i<fileNames.length; i++ ){
      var fileName = fileNames[i];
      var file = this.convertedFiles[fileName];

      for( var j=0; j<file.converted.length; j++ ){
        if( file.converted[j].indexOf('.mp4') > -1 ){
          files.push({
            name: fileName,
            path: file.converted[j]
          });
          break;
        }
      }
    }

    this.resetUploader();
    this.loadVideosForScreenGrab( files );
  },

  /**
   * Keeps track of the current conversion job, parsing & outputting
   * it's data. Will keep doing so until all logs in the queue have
   * completed.
   *
   * @param {Array} logFiles - The logs for the current conversion job.
   */
  getConversionProgress: function(logFiles){
    var _self = this;
    var logFile = logFiles[this.logIndex];
    var jobNumber = logFile.match(/\/(.*)\.log$/)[1];

    console.log( this.logPrefix + 'Processing job `'+ jobNumber +'`.' );

    Util.ajax({
      type: 'GET',
      url: logFile,
      onSuccess: function(resp){
        var lines = resp.split(/\r\n?/);
        var lastLine = lines[lines.length - 1];
        var parsed = {
          originalFile: '',
          files: [],
          currentFile: 0,
          totalFiles: 0,
          percentageComplete: 0,
          fullLog: resp
        };
        var videoDuration = 0;

        // Skip any parsing if processing is COMPLETE.
        if( lastLine.indexOf('[ COMPLETED ]') > -1 ){
          var completionData = JSON.parse(lastLine.replace('[ COMPLETED ] ', ''));
          var key = Object.keys( completionData );
          _self.convertedFiles[key] = completionData[key];
          _self.logIndex++;

          if( _self.logIndex === logFiles.length ){
            _self.handleConversionCompletion(logFiles);
            return;
          }
        }

        setTimeout(function(){
          _self.getConversionProgress(logFiles);
        }, 2000);

        // loop over lines and parse data
        for( var i=0; i<lines.length; i++ ){
          var line = lines[i];
          var match = undefined;

          if( line.indexOf('[ CONVERTING ]') > -1 ){
            match = line.match(/\] "(.*)"/);
            if( match.length ) parsed.originalFile = match[1];
          }

          // only get this once
          if(
            line.indexOf('[ START_TIME ]') > -1
            && !_self.conversionTimer
          ){
            match = line.match(/\] "(.*)"/);
            if( match.length ){
              _self.els.progressTimerEl.dataset.startTime = match[1];
              _self.startConversionTimer();
            }
          }

          if( line.indexOf('[ STARTING ]') > -1 ){
            match = line.match(/\] \((\d+) of (\d+)\) "(.*)"/);
            if( match.length ){
              parsed.currentFile = Number( match[1] );
              parsed.totalFiles = Number( match[2] );
              parsed.files.push( match[3].split('/').pop() );
            }
          }

          if( line.indexOf('Duration: ') > -1 ){
            match = line.match(/Duration: ([\d:.]+),/);
            if( match.length ) videoDuration = _self.parseTimecode( match[1] );
          }

          if( line.indexOf('frame= ') > -1 ){
            match = line.match(/time=([\d:.]+) /);
            if( match.length ){
              var currPerc = _self.parseTimecode( match[1] );
              parsed.percentageComplete = Math.round(( currPerc / videoDuration ) * 100);
            }
          }

          if( line.indexOf('[ CONVERTED ]') > -1 ){
            // Some files are just copies of converted files so account
            // for multiple files being 'converted' at once.
            var converted = line.replace(/\[ CONVERTED \] |"/g, '').split(' & ');
            // loop over converted and add any that don't exist
            for( var j=0; j<converted.length; j++ ){
              var file = converted[j].split('/').pop().trim();

              if( parsed.files.indexOf(file) == -1 ) parsed.files.push( file );
            }

            parsed.percentageComplete = 0;
          }
        }

        _self.renderConversionLog(parsed);
      },
      onError: function(resp){
        alert( resp.msg );
      }
    });
  },

  /**
   * Displays the conversion progress.
   *
   * @param {Object} resp - Server response.
   */
  displayConversionProgress: function(resp){
    Util.removeClass(this.cssModifiers.IS_HIDDEN, this.els.progressLog);
    Util.removeClass(this.cssModifiers.IS_INVISIBLE, this.els.progressItem);
    this.getConversionProgress(resp.logFiles);
  },

  /**
   * Takes the number of seconds that have passed and formats them into
   * a human readable format.
   *
   * @param {number} secs - Number of seconds.
   * @returns {string}
   */
  formatToTime: function(secs){
    var mins = parseInt(secs/60);
    var secs = secs%60;

    if( mins < 10 ) mins = '0'+ mins;
    if( secs < 10 ) secs = '0'+ secs;

    return mins +':'+ secs;
  },

  /**
   * Returns the amount of seconds that have passed since the first job
   * in the conversion batch has started.
   *
   * @returns {number}
   */
  getElapsedSeconds: function(){
    return Math.floor((Date.now() - (+this.els.progressTimerEl.dataset.startTime)) / 1000);
  },

  /**
   * Starts the `interval` that tracks how long a conversion job has
   * been processing for.
   */
  startConversionTimer: function(){
    var _self = this;
    this.els.progressTimerEl.dataset.elapsedTime = _self.formatToTime( _self.getElapsedSeconds() );

    Util.addClass( this.cssModifiers.IS_INVISIBLE, this.els.converterInputs );

    this.conversionTimer = setInterval(function(){
      _self.els.progressTimerEl.dataset.elapsedTime = _self.formatToTime( _self.getElapsedSeconds() );
    }, 1000);
  },

  /**
   * Stops the conversion `interval` and re-enables the UI.
   */
  stopConversionTimer: function(){
    clearInterval(this.conversionTimer);
    Util.removeClass( this.cssModifiers.IS_INVISIBLE, this.els.converterInputs );
  },

  /**
   * Starts converting the uploaded files.
   */
  startConversion: function(){
    var _self = this;
    var data = localStorage[this.cacheKey];
    if( data ) data = JSON.parse( data );
    var ajaxConf = {
      type: 'POST',
      url: 'php/api.php',
      data: {
        action: 'convertFiles',
        files: data.uploadedFiles
      },
      onSuccess: function(resp){
        _self.displayConversionProgress( resp );
      },
      onError: function(resp){
        _self.els.convertBtn.disabled = false;
        alert( resp.msg );
      }
    };

    this.els.convertBtn.disabled = true;

    if( this.finalVideoWidth ) ajaxConf.data.vidWidth = this.finalVideoWidth;
    if( this.finalVideoHeight ) ajaxConf.data.vidHeight = this.finalVideoHeight;

    Util.ajax( ajaxConf );
  },

  /**
   * Captures & uploads a screenshot from a video.
   *
   * @param {Event} ev - Click
   */
  handleGrabFrameClick: function(ev){
    var _self = this;
    var btn = ev.target;
    var wrapper = Util.closest(this.selectors.VIDEO_WRAPPER, btn);
    var video = wrapper.querySelector(this.selectors.VIDEO_FOR_SCREEN_GRAB);
    var scratch = document.createElement('canvas');
    var vW = video.videoWidth;
    var vH = video.videoHeight;
    var ctx;

    // disable the button so people don't get click happy
    btn.disabled = true;

    // spin up a canvas/context
    document.body.appendChild(scratch);
    scratch.width = vW;
    scratch.height = vH;
    scratch.setAttribute('style', 'position:absolute; top:-'+ vH +'px; left:0; opacity:0;');
    ctx = scratch.getContext('2d');
    ctx.fillRect(0, 0, vW, vH);
    ctx.drawImage(video, 0, 0, vW, vH);

    // capture the current frame
    console.log( this.logPrefix +"Current video time: `"+ video.dataset.scrubTime +"`" );
    Util.ajax({
      type: 'POST',
      url: 'php/api.php',
      data: {
        action: 'uploadVideoFrame',
        name: video.dataset.name,
        videoFrame: scratch.toDataURL('image/png')
      },
      onSuccess: function(resp){
        btn.disabled = false;
        wrapper.querySelector(_self.selectors.LOAD_VIDEO_BTN).disabled = false;

        // free up memory
        document.body.removeChild(scratch);

        console.log( _self.logPrefix + resp.msg +' `'+ resp.file +'`' );
      },
      onError: function(resp){
        alert( resp.msg );
      }
    });
  },

  /**
   * Hides the video's thumbnail and starts playing the video.
   *
   * @param {Event} ev - Click
   */
  handleVidPlayerPosterClick: function(ev){
    var btn = ev.target;
    var vidPlayer = Util.closest(this.selectors.VIDEO_PLAYER, btn);
    var video = vidPlayer.querySelector( 'video' );

    Util.addClass(this.cssModifiers.IS_HIDDEN, btn);
    video.play();
  },

  /**
   * Loads the video in it's embeddable form to the page. That includes
   * it's thumbnail overlay, and all it's converted sources.
   *
   * @param {Event} ev - Click
   */
  handleLoadVideoClick: function(ev){
    var _self = this;
    var btn = ev.target;
    var wrapper = Util.closest(this.selectors.VIDEO_WRAPPER, btn);
    var video = wrapper.querySelector(this.selectors.VIDEO_FOR_SCREEN_GRAB);

    // Replace the contents of the wrapper with the video and all it's
    // sources plus the poster image.
    console.log( this.logPrefix +"Load `"+ video.dataset.name +"`." );
    this.getConvertedVideos(video.dataset.name).then(function(resp){
      var markup = _self.generateVideoPlayerMarkup({
        atts: {
          width: resp.dims.width,
          height: resp.dims.height,
          poster: resp.poster
        },
        sources: resp.sources
      });

      wrapper.innerHTML = markup;
      wrapper.querySelector( _self.selectors.VIDEO_PLAYER_POSTER_BTN )
        .addEventListener('click', _self.handleVidPlayerPosterClick.bind(_self));
    });
  },

  /**
   * Gets the duration of the video, and sets up listeners that allow
   * for grabbing a video screenshot.
   *
   * @param {Event} ev - LoadedMetaData
   */
  handleLoadedMetaData: function(ev){
    var vid = ev.target;
    var wrapper = Util.closest(this.selectors.VIDEO_WRAPPER, vid);
    var scrubber = wrapper.querySelector( this.selectors.VIDEO_SCRUBBER );
    var timeEl = wrapper.querySelector( this.selectors.VIDEO_SCRUBBER_TIME );

    // props http://www.w3schools.com/tags/ref_av_dom.asp
    scrubber.max = Math.round(vid.duration * this.FPS);
    timeEl.dataset.duration = vid.duration.toFixed(3);

    this.setScrubTime(timeEl, '0.000');

    scrubber.addEventListener('focus', this.handleScrubberFocus.bind(this));
    scrubber.addEventListener('input', this.handleScrubberDrag.bind(this));
    scrubber.addEventListener('change', this.handleScrubberDrag.bind(this));
  },

  /**
   * In case there are multiple videos with scrubbers, we need to reset
   * `scrubTimeStamp` so that `input` & `change` don't both fire.
   *
   * @param {Event} ev - Focus
   */
  handleScrubberFocus: function(ev){
    this.scrubTimeStamp = undefined;
  },

  /**
   * Scrubs the video, and maintains the video's current time.
   *
   * @param {Event} ev - Input or Change
   */
  handleScrubberDrag: function(ev){
    // prevents `input` & `change` firing if the range has focus
    // and the keyboard is being used to increase/decrease the value.
    if( ev.timeStamp == this.scrubTimeStamp ) return false;

    var wrapper = Util.closest(this.selectors.VIDEO_WRAPPER, ev.target);
    var vid = wrapper.querySelector('video');
    var time = wrapper.querySelector( this.selectors.VIDEO_SCRUBBER_TIME );
    var scrubTime = (ev.target.value / this.FPS).toFixed(3);
    this.scrubTimeStamp = ev.timeStamp;

    // Due to varying framerates ensure the end duration millisecond value
    // matches what the duration's value is.
    if( +scrubTime > +time.dataset.duration ) scrubTime = time.dataset.duration;

    // `currentTime` won't be accurate unless the video is playing and the
    // `timeupdate` event fires. It also won't maintain the `toFixed` value.
    // So maintain the actual time.
    vid.currentTime = scrubTime;
    vid.dataset.scrubTime = scrubTime;
    this.setScrubTime(time, scrubTime);
  },

  /**
   * Adds padding to a String.
   *
   * @param {string} padding - A String used for filler.
   * @param {string} str - A String you want padded with filler text.
   * @returns {string}
   * @example
   * // outputs '032'
   * pad('000', '32');
   */
  pad: function(padding, str){
    return padding.substr(0, padding.length - str.length) + str;
  },

  /**
   * Converts a video's time into a normal time format. Currently it only
   * goes up to minutes.
   *
   * @param {string|number} time - A video time, something like `1423.033`.
   * @returns {string}
   */
  formatScrubTime: function(time){
    var timeArr = (''+ time).split('.');
    var mins = Math.floor( timeArr[0] / 60 ) + '';
    var secs = timeArr[0] % 60 + '';
    var milli = timeArr[1] + '';

    return this.pad('00', mins) +':'+ this.pad('00', secs) +'.'+ this.pad('000', milli);
  },

  /**
   * Updates the scrubber time display with the current video position
   * and duration.
   *
   * @param {HTMLElement} el - A screenshot wrapper's time output element.
   * @param {string|number} time - The current video time.
   */
  setScrubTime: function(el, time){
    el.innerText = this.formatScrubTime(time) +' / '+ this.formatScrubTime(el.dataset.duration);
  },

  /**
   * Builds out the markup & binds listeners which allow a user to take
   * a screenshot for each video provided.
   *
   * @param {Array} files - An Array of videos you want to grab a
   * screenshot from.
   */
  loadVideosForScreenGrab: function(files){
    var wrapperClass = this.selectors.VIDEO_WRAPPER.replace('.', '');
    var videoClass = this.selectors.VIDEO_FOR_SCREEN_GRAB.replace('.', '');
    var grabBtnClass = this.selectors.GRAB_FRAME_BTN.replace('.', '');
    var loadBtnClass = this.selectors.LOAD_VIDEO_BTN.replace('.', '');
    var videoScrubberClass = this.selectors.VIDEO_SCRUBBER.replace('.', '');
    var videoScrubberTimeClass = this.selectors.VIDEO_SCRUBBER_TIME.replace('.', '');
    var i;

    for( i=0; i<files.length; i++ ){
      var file = files[i];
      var vidMarkup = this.generateVideoPlayerMarkup({
        atts: {
          'class': videoClass,
          'data-name': file.name,
          controls: null
        },
        sources: {
          mp4: file.path
        }
      });

      this.els.screenGrabContainer.innerHTML +=
        '<div class="screen-grab__video-wrapper '+ wrapperClass +'">'
          +vidMarkup
          +'<nav class="screen-grab__scrubber">'
            +'<div class="screen-grab__range-wrapper">'
              +'<input type="range" class="'+ videoScrubberClass +'" min="0" max="150" value="0">'
            +'</div>'
            +'<div class="screen-grab__scrubber-time '+ videoScrubberTimeClass +'"></div>'
          +'</nav>'
          +'<nav class="screen-grab__ui">'
            +'<button type="button" class="base-input '+ grabBtnClass +'">Grab Frame</button>'
            +'<button type="button" class="base-input '+ loadBtnClass +'" disabled>Load Video</button>'
          +'</nav>'
        +'</div>';

      console.log(this.logPrefix +'Loading `'+ file.name +'` for screen grab.');
    }

    Util.removeClass(this.cssModifiers.IS_HIDDEN, this.els.screenGrabContainer);
    Util.addClass(this.cssModifiers.IS_HIDDEN, this.els.converterForm);

    var wrappers = this.els.screenGrabContainer.querySelectorAll(this.selectors.VIDEO_WRAPPER);
    for( i=0; i<wrappers.length; i++ ){
      var wrapper = wrappers[i];
      var vid = wrapper.querySelector( this.selectors.VIDEO_WRAPPER +' video' );
      var grabBtn = wrapper.querySelector( this.selectors.GRAB_FRAME_BTN );
      var loadBtn = wrapper.querySelector( this.selectors.LOAD_VIDEO_BTN );

      vid.addEventListener('loadedmetadata', this.handleLoadedMetaData.bind(this));
      grabBtn.addEventListener('click', this.handleGrabFrameClick.bind(this));
      loadBtn.addEventListener('click', this.handleLoadVideoClick.bind(this));
    }
  },

  /**
   * Gets all the sources of a converted video based on a base file name.
   *
   * @param {string} vidName - A name of a video that's been converted.
   * @returns {Promise}
   */
  getConvertedVideos: function(vidName){
    return Util.ajax({
      type: 'GET',
      url: 'php/api.php',
      data: {
        action: 'getVideoSources',
        name: vidName
      }
    });
  },

  /**
   * Builds out a string of DOM attributes based on the
   * specified Object.
   *
   * @param {Object} attsObj - An Object of properties.
   * @returns {string}
   */
  buildAttsStr: function(attsObj){
    var atts = [];

    for(var i in attsObj){
      if( attsObj.hasOwnProperty(i) && attsObj[i] ){
        atts.push( i +'="'+ attsObj[i] +'"' );
      }
    }

    return atts.join(' ');
  },

  /**
   * Builds out the markup required to display a video.
   *
   * @param {Object} opts - A configuration Object containing `atts` &
   * `sources`. The first being attributes like `width`, `height`,
   * `poster`. The second being a list of video sources.
   * @returns {string}
   */
  generateVideoPlayerMarkup: function(opts){
    opts = opts || {};

    var vidAtts = {
      preload: 'metadata',
      controls: 'controls'
    };
    // some browsers need the sources to be in a specific order
    var srcOrder = ['mp4', 'ogg', 'webm'];
    var srcMarkup = '';
    var vidMarkup, i;

    if( opts.atts ){
      for( i in opts.atts ){
        if( opts.atts.hasOwnProperty(i) ){
          vidAtts[i] = opts.atts[i];
        }
      }
    }

    if( opts.sources ){
      for( i=0; i<srcOrder.length; i++ ){
        var type = srcOrder[i];

        if( opts.sources[type] ){
          srcMarkup +=
            '<source'
            +' src="'+ opts.sources[type] +'"'
            +' type="video/'+ type +'"'
            +'>';
        }
      }
    }

    vidMarkup = '<video '+ this.buildAttsStr(vidAtts) +'>'+srcMarkup+'</video>';

    if( opts.atts.poster ){
      vidMarkup +=
        '<button class="video-player__poster-btn js-videoPlayerPosterBtn" title="Click to Play Video">'
          +'<img src="'+ opts.atts.poster +'">'
          +'<div class="video-player__poster-cta">'
            +'<label>Play</label>'
            +'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="video-player__play-icon" viewBox="0 0 100 75">'
              +'<rect class="video-player__play-icon__body" x="0" y="0" rx="10" ry="10" width="100" height="75" fill="#FF0000"></rect>'
              +'<polygon class="video-player__play-icon__arrow" points="30,15 75,37.5 30,60" fill="#FFF"></polygon>'
            +'</svg>'
          +'</div>'
        +'</button>';
    }

    return '<div class="video-player js-videoPlayer">'+ vidMarkup +'</div>';
  },

  /**
   * Adds all the listeners for the uploader.
   */
  addUploadListeners: function(){
    this.resetDropZoneText();

    this.els.dropZone.addEventListener('dragenter', this.handleDZEnter.bind(this));
    this.els.dropZone.addEventListener('dragover', this.handleDZOver.bind(this));
    this.els.dropZone.addEventListener('dragleave', this.handleDZEnd.bind(this));
    this.els.dropZone.addEventListener('dragend', this.handleDZEnd.bind(this));
    this.els.dropZone.addEventListener('drop', this.handleDZDrop.bind(this));
    this.els.fileInput.addEventListener('change', this.handleDZInputChange.bind(this));
    this.els.convertBtn.addEventListener('click', this.startConversion.bind(this));
    this.els.converterForm.addEventListener('submit', this.handleFormSubmit.bind(this));
  },

  /**
   * Checks if the required functionality is available in the current
   * browser, and if it's not, alerts the user.
   *
   * @returns {boolean}
   */
  apiCheck: function(){
    if(
      typeof window.File === 'undefined'
      && typeof window.FileReader === 'undefined'
      && typeof window.FileList === 'undefined'
      && typeof window.Blob === 'undefined'
    ){
      alert("[ ERROR ] FileReader not supported. Sorry, it looks like your browser can't run this example.");
      return false;
    }else if( typeof window.Promise === 'undefined' ){
      alert("[ ERROR ] Promises not supported. Sorry, it looks like your browser can't run this example.");
      return false;
    }

    return true;
  },

  /**
   * Gets the servers upload capabilities so we can alert the user of
   * any possible issues on load, or during the upload process.
   */
  getUploadCapabilities: function(){
    var _self = this;

    Util.ajax({
      type: 'GET',
      url: 'php/api.php',
      data: {
        action: 'checkUploadSettings'
      },
      onSuccess: function(resp){
        _self.uploadCapabilities = resp;

        if( _self.uploadCapabilities.fileUploads.value == 'off' ){
          _self.els.converterForm.parentNode.removeChild( _self.els.converterForm );
          alert("Your server has "+ _self.uploadCapabilities.fileUploads.label +" disabled. You'll need to enable `file_uploads` via `php.ini` or `httpd.conf`");
        }else{
          _self.addUploadListeners();
          if( localStorage[ _self.cacheKey ] ) _self.enableConverter(true);
        }
      },
      onError: function(resp){
        alert( resp.msg );
      }
    });
  }
};