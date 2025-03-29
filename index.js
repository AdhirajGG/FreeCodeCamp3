require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dns = require('dns');
const { promisify } = require('util');
const cors = require('cors'); 
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`)); // Serve static files


app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});


const dnsLookup = promisify(dns.lookup);
const urlDatabase = [];
let nextShortId = 1;

app.post('/api/shorturl', async (req, res) => {
  const submittedUrl = req.body.url;

  let parsedUrl;
  try {
    parsedUrl = new URL(submittedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

 
  try {
    await dnsLookup(parsedUrl.hostname);
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  const existingEntry = urlDatabase.find(entry => entry.original_url === submittedUrl);
  if (existingEntry) {
    return res.json(existingEntry);
  }

  const newEntry = {
    original_url: submittedUrl,
    short_url: nextShortId
  };
  urlDatabase.push(newEntry);
  nextShortId += 1;

  res.json(newEntry);
});

app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrlParam = req.params.short_url;
  const shortUrl = parseInt(shortUrlParam, 10);

  if (isNaN(shortUrl)) {
    return res.json({ error: 'invalid url' });
  }

  const entry = urlDatabase.find(e => e.short_url === shortUrl);
  if (entry) {
    res.redirect(entry.original_url);
  } else {
    res.json({ error: 'invalid url' });
  }
});

// Start server (single instance)
app.listen(port, function () {
  console.log(`Server running on port ${port}`);
});