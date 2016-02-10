## Sources

**Video**
- http://camendesign.com/code/video_for_everybody/test.html

## ffmpeg install (Windows)

- Find the download source https://ffmpeg.org/download.html
- Download the Static build from http://ffmpeg.zeranoe.com/builds/
  - I chose the 64-bit Download, (FFmpeg git-1d0487f 64-bit Static)
- Create a directory at the top of C called "ffmpeg" and unzip the contents in there.
- Win > Search > "env" > Select "Edit the System Environment Variables"
  - You should be in System Properties (Advanced tab). Click on the Environment Variables.. button
  at the bottom of the window.
  - Under System variables add `C:\ffmpeg\bin;` to the beginning of the existing
  `Path` variable.
  - Now when you start up a prompt you should be able to type `ffmpeg` and have it
  print out it's possible options.
- You can also just create a directory within your project and unzip the contents
there and just use the full path to the executable when running ffmpeg.


## Converting to web formats
- http://blog.superuser.com/2012/02/24/ffmpeg-the-ultimate-video-and-audio-manipulation-tool/
- https://gist.github.com/yellowled/1439610
- https://github.com/Kibo/html5_video_converter/blob/master/web_video_converter.sh
- http://tomasjurman.blogspot.com/2013/08/converting-video-for-web-with-ffmpeg.html
- Commands I've tried
  - ffmpeg/bin/ffmpeg.exe -i vids/big_buck_bunny.mp4 -c:v libx264 -ar 22050 -crf 28 -vf scale="280:-1" test3.flv
  - ffmpeg/bin/ffmpeg.exe -i vids/big_buck_bunny.mp4 -c:v libx264 -ar 22050 -crf 28 test2.flv
  - ffmpeg/bin/ffmpeg.exe -i vids/big_buck_bunny.mp4 -c:v libx264 -crf 19 test.flv
- Possibilities
  - ffmpeg -i STREAM.MP4 -acodec libvorbis -ac 2 -ab 96k -ar 44100 -b 345k -s 640×360 output.ogv
  - ffmpeg -i STREAM.MP4 -acodec libvorbis -ac 2 -ab 96k -ar 44100 -b 345k -s 640×360 output.webm
  - ffmpeg -i STREAM.MP4 -acodec libfaac -ab 96k -vcodec libx264 -vpre slower -vpre main -level 21 -refs 2 -b 345k -bt 345k -threads 0 -s 640×360 output.mp4

  
## Processing progress from server (PHP)
- http://stackoverflow.com/questions/7049303/show-progress-for-php-long-script
- http://www.htmlgoodies.com/beyond/php/show-progress-report-for-long-running-php-scripts.html
- https://www.youtube.com/watch?v=EraNFJiY0Eg
  - https://www.developphp.com/video/JavaScript/File-Upload-Progress-Bar-Meter-Tutorial-Ajax-PHP
- http://stackoverflow.com/questions/11441517/ffmpeg-progress-bar-encoding-percentage-in-php


- Upload file
  - Generate unique processing id. Maybe get the pid from PHP
  and name the log file that?
  - Return path to log file on server.
    - /folder/3456_32l45kj23lk54j234.log ( pid_uniqueHash.log )
- If log file returned, start polling the file to get the progress.
  - http://stackoverflow.com/a/17314793/5156659
  - async php script http://stackoverflow.com/a/6140302/5156659
  - After all files are processed, append [ COMPLETE ] to end.
  - If frontend gets complete message, tell server to remove the log.
  
