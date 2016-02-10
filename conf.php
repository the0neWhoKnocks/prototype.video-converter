<?php

// faking what a vhost would accomplish
define('ROOT', str_replace('\\', '/', dirname(__FILE__)));
define('RELATIVE_UPLOAD_DIR', 'uploads');
define('UPLOAD_DIR', ROOT.'/'.RELATIVE_UPLOAD_DIR);
define('RELATIVE_CONVERT_DIR', 'converted');
define('CONVERT_DIR', ROOT.'/'.RELATIVE_CONVERT_DIR);
define('FFMPEG', ROOT.'/bin/ffmpeg');
define('FFPROBE', ROOT.'/bin/ffprobe');