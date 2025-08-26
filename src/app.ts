import express from 'express';
import newsRouter from './apps/news/news.route';
import applicationRouter from './apps/application/application.route';
import teamMemberRouter from './apps/teamMember/teamMembers.route';
import userRouter from './apps/users/users.route';

import manageUserRouter from './apps/manageUsers/manageUsers.route';

import dashboardRouter from './apps/dashboard/dashboard.route';
import jobListingRouter from './apps/jobListing/jobListing.route';

import path from 'path';

import cors from "cors";
import fs from 'fs';

import multer from "multer";
import NodeCache from 'node-cache';

import { TeamMemberService } from './apps/teamMember/teamMember.service';
import { NewsService } from './apps/news/news.service';
import featuredStudentRouter from './apps/featuredStudent/featuredStudent.route';
import studentProfileRouter from './apps/studentProfile/studentProfile.route';
import trainingRouter from './apps/training/training.route';


const cache = new NodeCache({ stdTTL: 60 * 5 });

const teamMemberService = new TeamMemberService(); 
const newsService = new NewsService();

const app = express();

app.use(express.json()); 

app.use(cors());


const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});



app.get('/news/:id', async (req, res) => {
  const newsId = req.params.id;
  const result = await newsService.getNewsById(newsId);
  if (result.statusCode !== 200) {
    return res.sendFile(path.join(__dirname, '../../IAPM-front/IAP-M-frontend/build', 'index.html'));
  }
  const news = result.message;
  const mainImage = news.images.find((img: any) => img.isMain);
  
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = (
    /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent) ||
    /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
    /FBAN|FBAV|FB_IAB/i.test(userAgent) ||  
    (req.headers['sec-ch-ua-mobile'] === '?1')
  );
  
  console.log('First News Route - Device Check:', {
    route: 'First /news/:id',
    newsId,
    userAgent: userAgent.substring(0, 100),
    isMobile,
    hasMainImage: !!mainImage,
    availableUrls: {
      mobile: !!mainImage?.mobileSocialUrl,
      desktop: !!mainImage?.desktopSocialUrl,
      social: !!mainImage?.socialUrl,
      regular: !!mainImage?.url
    }
  });

  // Enhanced mobile detection
  const userAgent2 = req.headers['user-agent'] || '';
  const isMobile2 = (
    /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent2) ||
    /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent2) ||
    (req.headers['sec-ch-ua-mobile'] === '?1')
  );
  
  console.log('Device Detection:', {
    userAgent: userAgent2,
    isMobile: isMobile2,
    selectedImage: isMobile2 ? 'mobile' : 'desktop'
  });

  // Choose appropriate URL with fallbacks
  const imageUrl = isMobile2 
    ? (mainImage?.mobileSocialUrl || mainImage?.socialUrl || mainImage?.url)
    : (mainImage?.desktopSocialUrl || mainImage?.socialUrl || mainImage?.url);

  // Log the selected URL
  console.log('Selected Image URL:', {
    route: 'First /news/:id',
    newsId,
    isMobile: isMobile2,
    selectedUrl: imageUrl?.substring(0, 100),
    usingMobileVersion: imageUrl === mainImage?.mobileSocialUrl,
    usingDesktopVersion: imageUrl === mainImage?.desktopSocialUrl
  });
  
  const indexFile = '/var/www/iap-m/index.html';
  
  fs.readFile(indexFile, 'utf8', (err, htmlData) => {
    if (err) {
      return res.status(500).send('Error reading index.html');
    }
    const title = news.title;
    const description = news.content.split('\n').filter(Boolean).slice(0, 3).join(' ');
    
    // Modify image URL to ensure proper scaling
    // const baseImageUrl = news.imageUrl?.startsWith('http') ? news.imageUrl : `https://iap-m.com${news.imageUrl}`;
    // Change fit=crop to fit=contain and add position
    // const imageUrl = baseImageUrl.includes('supabase.co') 
    //   ? `${baseImageUrl.split('?')[0]}?width=1200&height=630&fit=contain&position=center`
    //   : `${baseImageUrl}?width=1200&height=630&fit=contain&position=center`;
    
    let customHtml = htmlData
      .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
      .replace(/<meta property="og:type" content=".*?"/, `<meta property="og:type" content="article"`)
      .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title}"`)
      .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${description}"`)
      .replace(/<meta property="og:image" content=".*?"/, `<meta property="og:image" content="${imageUrl}"`)
      .replace(/<meta property="og:image:width" content=".*?"/, `<meta property="og:image:width" content="${isMobile2 ? '800' : '1400'}"`)
      .replace(/<meta property="og:image:height" content=".*?"/, `<meta property="og:image:height" content="${isMobile2 ? '600' : '788'}"`)
      .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="https://iap-m.com/news/${newsId}"`)
      // Add additional scaling controls
      .replace(/<meta property="og:image:type" content=".*?"/, `<meta property="og:image:type" content="image/jpeg"`)
      .replace(/<meta property="og:image:alt" content=".*?"/, `<meta property="og:image:alt" content="${title}"`);

    // Add these new meta tags if they don't exist
    if (!customHtml.includes('og:image:aspect_ratio')) {
      customHtml = customHtml.replace('</head>',
        `${isMobile2 
          ? '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />'
          : ''
        }
        <meta property="og:image:aspect_ratio" content="${isMobile2 ? '1.33' : '1.91'}"/>
        <meta property="og:image:crop" content="false"/>
        </head>`
      );
    }

    res.send(customHtml);
  });
});

app.get('/bord/team/:id', async (req, res) => {  
  const memberId = req.params.id;
  const result = await teamMemberService.getTeamMemberById(memberId);
  console.log('Team member fetch result:', result);
  
  if (result.statusCode !== 200) {
    console.log('Team member not found for ID:', memberId);
    return res.sendFile(path.join(
      __dirname,
      '../../IAPM-front/IAP-M-frontend/build',
      'index.html'
    ));
  }
  
  const member = result.message;
  const indexFile = '/var/www/iap-m/index.html';
  
  fs.readFile(indexFile, 'utf8', (err, htmlData) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error reading index.html');
    }
    
    const nameParts = member.fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const title = `${member.fullName} - ${member.title} | IAP-M Team Member`;
    const description = member.description || `Learn more about ${member.fullName}, ${member.title} at IAP-M`;
    const imageUrl = member.imagePath?.startsWith('http') ? 
      member.imagePath : 
      `https://iap-m.com${member.imagePath}`;
    const url = `https://iap-m.com/bord/team/${memberId}`;
    
    let customHtml = htmlData
      .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta[^>]*property="og:type"[^>]*>/i, `<meta property="og:type" content="profile" />`)
      .replace(/<meta[^>]*property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta[^>]*property="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`)
      .replace(/<meta[^>]*property="og:image"[^>]*>/i, `<meta property="og:image" content="${imageUrl}" />`)
      .replace(/<meta[^>]*property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`)
      .replace(/<meta[^>]*property="profile:first_name"[^>]*>/i, `<meta property="profile:first_name" content="${firstName}" />`)
      .replace(/<meta[^>]*property="profile:last_name"[^>]*>/i, `<meta property="profile:last_name" content="${lastName}" />`)
      .replace(/<meta[^>]*property="profile:username"[^>]*>/i, `<meta property="profile:username" content="${member.fullName}" />`)
      .replace(/<meta[^>]*property="profile:title"[^>]*>/i, `<meta property="profile:title" content="${member.title}" />`)
      .replace(/<meta[^>]*name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`)
      .replace(/<meta[^>]*name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${description}" />`)
      .replace(/<meta[^>]*name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${imageUrl}" />`);

    res.send(customHtml);
  });
});


const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));


app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  
  res.json({ 
    url: fileUrl,
    socialUrl: `${fileUrl}?width=1200&height=630&fit=inside`
  });
});




async function preloadCache() {
  try {

    const teamMembersData = await teamMemberService.getAllTeamMembers();
    if (teamMembersData.statusCode === 200) {
      cache.set('/team-members', teamMembersData.message);
      console.log("Team members data preloaded into cache.");
    } else {
      console.log("Error during cache preloading: ", teamMembersData.message);
    }

    const newsData = await newsService.getAllNews();
    if (newsData) {
      cache.set('/news', newsData); 
      console.log("News data preloaded into cache.");
    } else {
      console.log("Error during cache preloading for news.");
    }
  } catch (error) {
    console.error("Error preloading team members:", error);
  }
}

preloadCache();

setInterval(preloadCache, 5 * 60 * 1000);

function invalidateRelatedCache(path: string) {
  const keys = cache.keys();
  const relatedKeys = keys.filter(key => key.includes(path));
  console.log('Invalidating cache keys:', relatedKeys);
  relatedKeys.forEach(key => cache.del(key));
}

function cacheMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method !== 'GET') {
    const basePath = req.path.split('/')[1]; 
    invalidateRelatedCache(basePath);
    return next();
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  
  if (cachedResponse) {
    console.log("Serving cached data for: ", key);
    return res.json(cachedResponse);
  } else {
    console.log("No cache found, fetching data from DB for: ", key);
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      console.log("Caching new response for: ", key);
      cache.set(key, body);
      return originalJson(body);
    };
    next();
  }
}

// First, API routes
app.use('/api/news', cacheMiddleware, newsRouter);
app.use('/team-members', cacheMiddleware, teamMemberRouter);
app.use('/applications', cacheMiddleware, applicationRouter);
app.use('/job-listings', jobListingRouter); 
app.use("/users", cacheMiddleware, userRouter);
app.use("/manageUsers", cacheMiddleware,  manageUserRouter);
app.use("/dashboard", cacheMiddleware, dashboardRouter);
app.use('/training-programs-iap', trainingRouter);
app.use("/featured-students", cacheMiddleware, featuredStudentRouter);
app.use('/student-profile', studentProfileRouter);



// Create a middleware to check if request is for static file
const isStaticFile = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ext = path.extname(req.path);
  if (ext) {
    // If path has extension, treat as static file
    express.static('/var/www/iap-m')(req, res, next);
  } else {
    next();
  }
};

// Serve static files but only if they have an extension
app.use(isStaticFile);

// Then, special server-side rendered routes - ORDER MATTERSs!
// Team member routes should come before news routes
app.get('/bord/team/:id', async (req, res) => {  
  console.log('🔍 TEAM MEMBER ROUTE HIT:', req.url);
  const memberId = req.params.id;
  const result = await teamMemberService.getTeamMemberById(memberId);
  console.log('Team member fetch result:', result);
  
  if (result.statusCode !== 200) {
    console.log('Team member not found for ID:', memberId);
    return res.sendFile(path.join(
      __dirname,
      '../../IAPM-front/IAP-M-frontend/build',
      'index.html'
    ));
  }
  
  const member = result.message;
  const indexFile = '/var/www/iap-m/index.html';
  
  fs.readFile(indexFile, 'utf8', (err, htmlData) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error reading index.html');
    }
    
    const nameParts = member.fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const title = `${member.fullName} - ${member.title} | IAP-M Team Member`;
    const description = member.description || `Learn more about ${member.fullName}, ${member.title} at IAP-M`;
    const imageUrl = member.imagePath?.startsWith('http') ? 
      member.imagePath : 
      `https://iap-m.com${member.imagePath}`;
    const url = `https://iap-m.com/bord/team/${memberId}`;
    
    console.log('🔍 Setting team member meta tags:', {
      title,
      description: description.substring(0, 50) + '...',
      imageUrl,
      url
    });

    // Ensure we're not accidentally matching the news route's meta tags
    let customHtml = htmlData
      .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta[^>]*property="og:type"[^>]*>/i, `<meta property="og:type" content="profile" />`)
      .replace(/<meta[^>]*property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta[^>]*property="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`)
      .replace(/<meta[^>]*property="og:image"[^>]*>/i, `<meta property="og:image" content="${imageUrl}" />`)
      .replace(/<meta[^>]*property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`)
      .replace(/<meta[^>]*property="profile:first_name"[^>]*>/i, `<meta property="profile:first_name" content="${firstName}" />`)
      .replace(/<meta[^>]*property="profile:last_name"[^>]*>/i, `<meta property="profile:last_name" content="${lastName}" />`)
      .replace(/<meta[^>]*property="profile:username"[^>]*>/i, `<meta property="profile:username" content="${member.fullName}" />`)
      .replace(/<meta[^>]*property="profile:title"[^>]*>/i, `<meta property="profile:title" content="${member.title}" />`)
      .replace(/<meta[^>]*name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`)
      .replace(/<meta[^>]*name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${description}" />`)
      .replace(/<meta[^>]*name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${imageUrl}" />`);

    console.log('🔍 Meta tags after replacement:', customHtml.match(/<meta[^>]*>/g)?.join('\n'));
    
    res.send(customHtml);
  });
});

app.get('/news/:id', async (req, res) => {
  const newsId = req.params.id;
  const result = await newsService.getNewsById(newsId);
  if (result.statusCode !== 200) {
    return res.sendFile(path.join(
      __dirname,
      '../../IAPM-front/IAP-M-frontend/build',
      'index.html'
    ));
  }
  const news = result.message;
  const mainImage = news.images.find((img: any) => img.isMain);
  
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = (
    /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent) ||
    /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
    /FBAN|FBAV|FB_IAB/i.test(userAgent) ||  
    (req.headers['sec-ch-ua-mobile'] === '?1')
  );

  console.log('Second News Route - Device Check:', {
    route: 'Second /news/:id',
    newsId,
    userAgent: userAgent.substring(0, 100),
    isMobile,
    hasMainImage: !!mainImage,
    availableUrls: {
      mobile: !!mainImage?.mobileSocialUrl,
      desktop: !!mainImage?.desktopSocialUrl,
      social: !!mainImage?.socialUrl,
      regular: !!mainImage?.url
    }
  });

  const imageUrl = isMobile 
    ? (mainImage?.mobileSocialUrl || mainImage?.socialUrl || mainImage?.url)
    : (mainImage?.desktopSocialUrl || mainImage?.socialUrl || mainImage?.url);

  console.log('Selected Image URL:', {
    route: 'Second /news/:id',
    newsId,
    isMobile,
    selectedUrl: imageUrl?.substring(0, 100),
    usingMobileVersion: imageUrl === mainImage?.mobileSocialUrl,
    usingDesktopVersion: imageUrl === mainImage?.desktopSocialUrl
  });

  const indexFile = '/var/www/iap-m/index.html';
  console.log('Trying to read index.html from:', indexFile);
  fs.readFile(indexFile, 'utf8', (err, htmlData) => {
    if (err) {
      return res.status(500).send('Error reading index.html');
    }
    const title = news.title;
    const description = news.content.split('\n').filter(Boolean).slice(0, 3).join(' ');
    // const imageUrl = news.imageUrl?.startsWith('http') ? news.imageUrl : `https://iap-m.com${news.imageUrl}`;
    const url = `https://iap-m.com/news/${newsId}`;
    const socialImageUrl = `https://iap-m.com/social-image/${newsId}`;
    let customHtml = htmlData
      .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
      .replace(/<meta property="og:type" content=".*?"/, `<meta property="og:type" content="article"`)
      .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title}"`)
      .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${description}"`)
      .replace(/<meta property="og:image" content=".*?"/, `<meta property="og:image" content="${imageUrl}"`)
      .replace(/<meta property="og:image:width" content=".*?"/, `<meta property="og:image:width" content="${isMobile ? '800' : '1400'}"`)
      .replace(/<meta property="og:image:height" content=".*?"/, `<meta property="og:image:height" content="${isMobile ? '600' : '788'}"`)
      .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="https://iap-m.com/news/${newsId}"`)
      .replace(/<meta property="og:image:type" content=".*?"/, `<meta property="og:image:type" content="image/jpeg"`)
      .replace(/<meta property="og:image:alt" content=".*?"/, `<meta property="og:image:alt" content="${title}"`);

    if (!customHtml.includes('og:image:aspect_ratio')) {
      customHtml = customHtml.replace('</head>',
        `${isMobile 
          ? '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />'
          : ''
        }
        <meta property="og:image:aspect_ratio" content="${isMobile ? '1.33' : '1.91'}"/>
        <meta property="og:image:crop" content="false"/>
        </head>`
      );
    }
    res.send(customHtml);
  });
});

// Catch-all route for SPA should be last
app.get('*', (req, res) => {
  console.log('⚠️ CATCH-ALL ROUTE HIT:', req.url);
  res.sendFile(path.join('/var/www/iap-m', 'index.html'));
});

export default app;
