const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf-8');
if (!content.includes('window.onerror')) {
  const script = `
    <script>
      window.onerror = function(message, source, lineno, colno, error) {
        document.body.innerHTML += '<div style="color:red; background:white; padding:20px; z-index:9999; position:absolute; top:0; left:0; right:0;"><b>Global Error:</b> ' + message + '<br/>' + source + ':' + lineno + ':' + colno + '<pre>' + (error ? error.stack : '') + '</pre></div>';
      };
      window.addEventListener('unhandledrejection', function(event) {
        document.body.innerHTML += '<div style="color:red; background:white; padding:20px; z-index:9999; position:absolute; top:0; left:0; right:0;"><b>Unhandled Promise Rejection:</b> ' + event.reason + '</div>';
      });
    </script>
  `;
  const newContent = content.replace('<head>', '<head>' + script);
  fs.writeFileSync('index.html', newContent);
}
