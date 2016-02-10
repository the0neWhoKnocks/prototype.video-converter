<?php

require_once('../conf.php');

$httpStatusCodes = [
  200 => 'OK',
  400 => 'Bad Request',
  404 => 'Not Found',
  500 => 'Internal Server Error',
  501 => 'Not Implemented'
];
$req = ( !empty($_POST) ) ? (object) $_POST : (object) $_GET;

function _parseFilesObject($files){
  $ret = [];

  foreach($files as $key=>$prop){
    foreach($prop as $ndx=>$val){
      if( !isset($ret[$ndx]) ){
        $ret[$ndx] = new stdClass();
      }

      $obj = $ret[$ndx];
      $obj->$key = $val;
    }
  }

  return $ret;
}

function _setStatus($code){
  global $httpStatusCodes;

  header($_SERVER['SERVER_PROTOCOL'] .' '. $code .' '. $httpStatusCodes[$code], true, $code);
  header("Content-type: application/json; charset=utf-8");
}

function _success($data, $close=true){
  if( $close ){
    _setStatus(200);
    echo json_encode($data);
    exit();
  }else{
    // this magical combination allows a response to be sent while
    // letting the script to continue processing.
    @apache_setenv('no-gzip', 1);
    @ini_set('zlib.output_compression', 0);
    @ini_set('implicit_flush', 1);
    for ($i = 0; $i < ob_get_level(); $i++) { ob_end_flush(); }
    ob_implicit_flush(1);

    ob_end_clean();
    ignore_user_abort();
    ob_start();
    header("Connection: close");
    _setStatus(200);
    echo json_encode($data);
    header("Content-Length: " . ob_get_length());
    ob_end_flush();
    flush();
  }
}

function _error($code, $msg){
  _setStatus($code);
  echo json_encode([
    'msg' => $msg
  ]);
  exit();
}

function checkUploadSettings(){
  _success([
    'fileUploads' => [
      'label' => 'File Uploads',
      'value' => ( ini_get('file_uploads') == '1' ) ? 'on' : 'off'
    ],
    'maxUploadSize' => [
      'label' => 'Max Upload Size',
      'value' => ini_get('upload_max_filesize'),
      'int' => intval( ini_get('upload_max_filesize') )
    ],
    'maxPostSize' => [
      'label' => 'Max Post Size',
      'value' => ini_get('post_max_size'),
      'int' => intval( ini_get('post_max_size') )
    ],
    'memoryLimit' => [
      'label' => 'Memory Limit',
      'value' => ini_get('memory_limit'),
      'int' => intval( ini_get('memory_limit') )
    ]
  ]);
}

function ffmpegTest(){
  exec( FFMPEG .' -version', $output );

  if( $output != '' ){
    _success([
      'versionData' => join("<br>", $output)
    ]);
  }else{
    _error(501, "ffmpeg not found.");
  }
}

function _conversionPreFlight($files, &$error=[]){
  if( !is_dir(CONVERT_DIR) ){
    $error = (object) [
      'code' => 500,
      'msg' => "The conversion directory doesn't exist. `". CONVERT_DIR ."`"
    ];
    return false;
  }
  if( !is_writable(CONVERT_DIR) ){
    $error = (object) [
      'code' => 500,
      'msg' => "The conversion directory isn't writable. `". CONVERT_DIR ."`"
    ];
    return false;
  }

  // check if ffmpeg is installed
  exec( FFMPEG .' -version', $verOutput );
  if( $verOutput != '' ){
    $logs = [];
    $systemLogs = [];

    foreach($files as $file){
      $hash = hash('md5', $file->name);
      $logs[] = RELATIVE_CONVERT_DIR ."/$hash.log";
      $systemLogs[] = CONVERT_DIR ."/$hash.log";
    }

    return (object) [
      'logs' => $logs,
      'systemLogs' => $systemLogs
    ];
  }

  $error = (object) [
    'code' => 501,
    'msg' => 'ffmpeg not found.'
  ];
  return false;
}

function _generateCacheBuster($path){
  return '?cb='. filemtime($path);
}

function _convertVideos($files, $dims, $logFiles){
  // Could take a while so ensure no `Maximum execution time` errors are thrown.
  set_time_limit(0);

  // Create log files first so that if this method gets hit again, like
  // when the user closes the tab then reloads a cached state, another
  // process won't be spun up for the same job.
  $time = explode(' ', microtime());
  $startTime = sprintf('%d%03d', $time[1], $time[0] * 1000);
  $exit = false;
  foreach($files as $key=>$file){
    $logFile = $logFiles[$key];

    if( !is_file($logFile) ){
      file_put_contents($logFile, "[ START_TIME ] \"$startTime\" ".PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
    }else{
      $exit = true;
      break;
    }
  }
  if( $exit ) exit();

  // In order for the h264 lib to be able to scale videos, the aspect
  // ratios have to be divisible by 2 so use `-2` instead of `-1`.
  $vidWidth = ( isset($dims['vidWidth']) ) ? $dims['vidWidth'] : '-2';
  $vidHeight = ( isset($dims['vidHeight']) ) ? $dims['vidHeight'] : '-2';
  $vidDims = "$vidWidth:$vidHeight";

  foreach($files as $key=>$file){
    $logFile = $logFiles[$key];
    $systemPath = CONVERT_DIR ."/$file->name";
    $relativePath = RELATIVE_CONVERT_DIR ."/$file->name";
    $vid = [];
    $vid[$file->name] = new stdClass();
    $vid[$file->name]->converted = [];
    $vid[$file->name]->failed = [];

    file_put_contents($logFile, "[ CONVERTING ] \"$file->name\" ".PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);

    file_put_contents($logFile, "[ STARTING ] (1 of 4) \"$systemPath.ogv\" ".PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
    exec( FFMPEG ." -y -i $file->systemSrc -acodec libvorbis -ac 2 -b:a 96k -ar 44100 -b:v 345k -vf scale='$vidDims' $systemPath.ogv >> $logFile 2>&1", $ogvOutput, $ogvReturn );
    if( !$ogvReturn ){
      copy( "$systemPath.ogv", "$systemPath.webm" );
      file_put_contents($logFile, PHP_EOL."[ CONVERTED ] \"$systemPath.ogv\" & \"$systemPath.webm\" ".PHP_EOL.PHP_EOL.'----'.PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
      $cb = _generateCacheBuster("$systemPath.ogv");
      $vid[$file->name]->converted[] = "$relativePath.ogv$cb";
      $vid[$file->name]->converted[] = "$relativePath.webm$cb";
    }else{
      $vid[$file->name]->failed[] = "$relativePath.ogv";
      $vid[$file->name]->failed[] = "$relativePath.webm";
    }

    file_put_contents($logFile, "[ STARTING ] (3 of 4) \"$systemPath.mp4\" ".PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
    exec( FFMPEG ." -y -i $file->systemSrc -acodec aac -strict -2 -b:a 96k -vcodec libx264 -preset slower -level 21 -refs 2 -b:v 345k -threads 0 -vf scale='$vidDims' $systemPath.mp4 >> $logFile 2>&1", $mp4Output, $mp4Return );
    if( !$mp4Return ){
      file_put_contents($logFile, PHP_EOL."[ CONVERTED ] \"$systemPath.mp4\" ".PHP_EOL.PHP_EOL.'----'.PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
      $vid[$file->name]->converted[] = "$relativePath.mp4" . _generateCacheBuster("$systemPath.mp4");
    }else{
      $vid[$file->name]->failed[] = "$relativePath.mp4";
    }

    file_put_contents($logFile, "[ STARTING ] (4 of 4) \"$systemPath.flv\" ".PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
    exec( FFMPEG ." -y -i $systemPath.mp4 -c:v libx264 -crf 19 $systemPath.flv >> $logFile 2>&1", $flvOutput, $flvReturn );
    if( !$flvReturn ){
      file_put_contents($logFile, PHP_EOL."[ CONVERTED ] \"$systemPath.flv\" ".PHP_EOL.PHP_EOL.'----'.PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
      $vid[$file->name]->converted[] = "$relativePath.flv" . _generateCacheBuster("$systemPath.flv");
    }else{
      $vid[$file->name]->failed[] = "$relativePath.flv";
    }

    unlink($file->systemSrc);

    file_put_contents($logFile, "[ COMPLETED ] ". json_encode($vid), FILE_APPEND | LOCK_EX);
  }
}

function uploadVideos(){
  if( empty($_FILES) ) _error(400, "No video file was uploaded");
  if( !is_dir(UPLOAD_DIR) ) _error(500, "Error uploading files, `". UPLOAD_DIR ."` is not a valid path.");
  if( !is_writable(UPLOAD_DIR) ) _error(500, "Error uploading files, `". UPLOAD_DIR ."` is not writable.");

  $files = _parseFilesObject( $_FILES['videoFile'] );
  $uploadedFiles = [];
  $ignoredFiles = [];

  foreach($files as $ndx=>&$file){
    // only deal with video files
    if( preg_match('#video/(?:mp4|ogv|webm|flv)#', $file->type) ){
      $fParts = pathinfo($file->name);
      $fName = $fParts['filename'] .'.orig.'. $fParts['extension'];
      $vidPath = UPLOAD_DIR ."/$fName";
      move_uploaded_file( $file->tmp_name, $vidPath );
      unset( $file->tmp_name );
      $file->systemSrc = $vidPath;
      $file->src = RELATIVE_UPLOAD_DIR ."/$fName";
      $file->name = $fParts['filename'];
      $file->ext = $fParts['extension'];
      $uploadedFiles[] = $file;
    }else{
      $ignoredFiles[] = $file->name;
      unset( $files[$ndx] );
    }
  }

  _success([
    'msg' => 'Videos uploaded.',
    'uploadedFiles' => $uploadedFiles,
    'ignoredFiles' => $ignoredFiles
  ]);
}

function uploadVideoFrame($name, $videoFrame){
  $img = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $videoFrame));
  $name = $name.'.poster.png';

  if( file_put_contents(CONVERT_DIR."/$name", $img) ){
    _success([
      'msg' => 'Frame Saved',
      'file' =>RELATIVE_CONVERT_DIR."/$name" . _generateCacheBuster(CONVERT_DIR."/$name")
    ]);
  }else{
    _error(500, "Couldn't save video frame.");
  }
}

function convertFiles($files, $dims){
  foreach($files as &$file){
    $file = json_decode($file);
  }

  if( $result = _conversionPreFlight($files, $error) ){
    _success([
      'msg' => "Converting files",
      'logFiles' => $result->logs
    ], false);

    _convertVideos($files, $dims, $result->systemLogs);
  }else{
    _error($error->code, $error->msg);
  }
}

function removeLogs($logFiles){
  if( !empty($logFiles) ){
    $deleted = [];
    $remaining = [];

    foreach( $logFiles as $logFile ){
      $file = ROOT."/$logFile";

      if( @unlink($file) ) $deleted[] = $file;
      else $remaining[] = $file;
    }

    if( count($deleted) == count($logFiles) ){
      _success([
        'msg' => 'The logs were deleted.'
      ]);
    }else{
      _error(500, "There was a problem deleting ". count($remaining) ." logs.");
    }
  }else{
    _error(400, "You didn't tell me what files you wanted to delete.");
  }
}

function getVideoSources($name){
  $sources = new stdClass();
  $poster = null;

  foreach( glob(CONVERT_DIR."/$name.*") as $file ){
    $file = pathinfo($file);
    $ext = $file['extension'];
    $path = RELATIVE_CONVERT_DIR .'/'. $file['basename'];

    // keep track of at least one file so it's dimensions can be read
    $foundFile = CONVERT_DIR .'/'. $file['basename'];

    // normalize types against extensions (stupid ogv's)
    switch( $ext ){
      case 'ogv' :
        $sources->ogg = $path . _generateCacheBuster($foundFile);
        break;

      case 'png' :
        $poster = $path . _generateCacheBuster($foundFile);
        break;

      default :
        $sources->$ext = $path . _generateCacheBuster($foundFile);
    }
  }

  if( empty((array) $sources) ){
    _success([
      'msg' => 'No sources found'
    ]);
  }else{
    $resp = [
      'msg' => 'Sources found',
      'sources' => $sources
    ];

    if( $poster ) $resp['poster'] = $poster;

    // get video dimensions
    exec( FFPROBE ." -v error -select_streams v:0 -show_entries stream=width,height -of default=noprint_wrappers=1 \"$foundFile\" 2>&1", $output );
    if( !empty($output) ){
      $resp['dims'] = [
        'width' => (int) str_replace('width=', '', $output[0]),
        'height' => (int) str_replace('height=', '', $output[1])
      ];
    }

    _success($resp);
  }
}

if( isset($req->action) ){
  switch( $req->action ){
    case 'uploadVideos' :
      uploadVideos();
      break;
    case 'uploadVideoFrame' :
      if(
        isset($req->name)
        && isset($req->videoFrame)
      ){
        uploadVideoFrame($req->name, $req->videoFrame);
      }else{
        _error(400, "Required params `name` or `videoFrame` not set.");
      }
      break;
    case 'convertFiles' :
      if(
        isset($req->files)
        && isset($req->vidWidth) || isset($req->vidHeight)
      ){
        $dims = [];

        if( isset($req->vidWidth) ) $dims['vidWidth'] = $req->vidWidth;
        if( isset($req->vidHeight) ) $dims['vidHeight'] = $req->vidHeight;

        convertFiles($req->files, $dims);
      }else{
        _error(400, "Required param `files` or `vidWidth`/`vidHeight` not set.");
      }
      break;
    case 'removeLogs' :
      if( isset($req->logFiles) ) removeLogs($req->logFiles);
      else _error(400, "Required param `logFiles` not set.");
      break;
    case 'checkUploadSettings' :
      checkUploadSettings();
      break;
    case 'ffmpegTest' :
      ffmpegTest();
      break;
    case 'getVideoSources' :
      if( isset($req->name) ) getVideoSources($req->name);
      else _error(400, "Required param `name` not set.");
      break;
  }
}else{
  _error(400, "No action was set.");
}
