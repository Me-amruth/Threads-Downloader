const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
const { parse } = require('node-html-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.get('/api/threads', async (req, res) => {
let url = req.query.url;
if (url.includes('?xmt=')) {
  url = url.split('?xmt=')[0];
} else if (url.lastIndexOf("/") === url.length - 1 && !url.includes('?xmt=')) {
  url = url.slice(0, -1);
}

  try {
    const result = await getPostLink(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred'});
  }
});

async function getPostLink(url) {
  try {
    url = url + "/embed/";
    const response = await axios.get(url);
    const root = parse(response.data);

    let link = '';

    if (root.querySelector('.SingleInnerMediaContainerVideo.SingleInnerMediaContainer')) {
      link = getVideoLinkFromHtml(response.data);
    } else if(root.querySelector('.SingleInnerMediaContainer')) {
      var divEl = root.querySelector('.SingleInnerMediaContainer');
      if (divEl) {
        var imgEl = divEl.querySelector('img');
        link = imgEl.getAttribute("src");
      }
    } else if (root.querySelector('.MediaScrollImageContainer')) {
  var links = [];
  var divEls = root.querySelectorAll('.MediaScrollImageContainer');
  
  divEls.forEach(function(divEl) {
    var imgEl = divEl.querySelector('img');
    var lin = imgEl.getAttribute("src");
    lin = lin.replace("&amp;","&");
    links.push(lin);
  });
      
      var urls = links;
      } else {
      return {error:'Given url is not a media url' }
    }

    while (link.search("&amp;") !== -1) {
      link = link.replace("&amp;", "&");
    }
    link = urls || link;
    const caption = await getCaptionFromHtml(response.data);

    return { link, caption };
  } catch (error) {
    throw new Error('Failed to fetch post link ');
  }
}


async function getCaptionFromHtml(html) {
  const root = parse(html);

  let caption = root.querySelector('.BodyTextContainer')?.text;
  if (caption == undefined)
    caption = 'No caption';
  return caption;
}

function getVideoLinkFromHtml(html) {
  const code = parse(html);
  const vidEl = code.querySelector('.SingleInnerMediaContainerVideo.SingleInnerMediaContainer');
  var videoUrl = vidEl.querySelector('source');
  var videoLink = videoUrl.getAttribute("src");
  return videoLink;
}

app.get('/api/profileInfo', async (req, res) => {
  try {
    const query = req.query
    const q = query.query || query

    if(!query) {
      res.status(400).json({ error: 'No query Provided' });
      return;
    }
    
    const url = `https://www.threads.net/${q}`
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const title = $('title').text();
    
    if (!title.includes('@')) {
      res.status(404).json({ error: 'User Not Found' });
      return;
    }
    
    const pp_url = $(`meta[property='og:image']`).attr('content');
    const desc = $(`meta[property='og:description']`).attr('content')

    let descParts = "" 
    if (desc) {
   descParts = desc.split('. ');
} 
    
    const name = title.split("(")[0];
    let bio = "" 
    let followers = "" 
    const username = q
    if (descParts !== "") {
     bio = descParts[0]
     followers = descParts[1].split(" ")[0];
     }
    
    const profileInfo = {
      username: username, 
      name: name,
      bio: bio,
      followers: followers,
      pp_url: pp_url,
    };

    const formattedJSON = JSON.stringify(profileInfo, null, 2);

    res.set('Content-Type', 'application/json');
    res.send(formattedJSON);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.listen(PORT, () => {
  console.log(`API server is running on port ${PORT}`);
})
