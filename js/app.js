document.addEventListener('DOMContentLoaded', function(ev){
  window.app = {};

  app.videoConverter = new VideoConverter({
    placeholder: '#placeholder',
    finalVideoWidth: undefined,
    finalVideoHeight: 240
  });
});