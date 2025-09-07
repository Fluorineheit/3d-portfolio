import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const rayCaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Camera animation state
let isAnimating = false;
let animationId = null;
const originalCameraPosition = new THREE.Vector3(25.688755018841892, 4.3063773636979565, 15.100411821420774);
const originalTarget = new THREE.Vector3(0.17666347376958655, 7.040941209607237, 1.8224583297318953);

// UI State
let currentUIScreen = null;
let uiGroup = new THREE.Group();
uiGroup.name = "UIGroup";

// // Loading Screen Logic 
// const loadingScreen = document.getElementById('loading-screen');
// const loadingBar = document.getElementById('loading-bar');

// const loadingManager = new THREE.LoadingManager();

// loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
//   const progressRatio = itemsLoaded / itemsTotal;
//   loadingBar.style.width = `${progressRatio * 100}%`;
// };

// loadingManager.onLoad = () => {
//   // Use a timeout to ensure the bar fills before fading
//   setTimeout(() => {
//     loadingScreen.classList.add('fade-out');
//     // Optional: remove the loading screen from the DOM after the transition
//     setTimeout(() => {
//       loadingScreen.style.display = 'none';
//     }, 1000); // Must match the transition duration in CSS
//   }, 500);
// };

const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    
    if (window.loadingScreen) {
        window.loadingScreen.updateProgress(progress);
    }
};

loadingManager.onLoad = () => {
    // Ensure the loader finishes at 100%
    if (window.loadingScreen) {
        window.loadingScreen.updateProgress(100, "Ready!");
    }
};

// loaders
const textureLoader = new THREE.TextureLoader(loadingManager);
const loader = new GLTFLoader(loadingManager)

const textureMap = {
  Floor : {texture: '/textures/MainFloorBake.jpg'},
  MainBuilding : {texture: '/textures/BuildingBake.jpg'},
  Items : {texture: '/textures/ItemsBake.jpg'},
  Tree : {texture: '/textures/holobake.png'},
  Text : {texture: '/textures/FontBake.jpg'},
  ClickableScreen_Raycaster: {texture: '/textures/Clickable.jpg'}
}

const loaderTexture = {
  texture: {},
}

Object.entries(textureMap).forEach(([key, paths]) => {
  const texturePath = textureLoader.load(paths.texture);
  texturePath.channel=1;
  texturePath.flipY = false;
  texturePath.colorSpace = THREE.SRGBColorSpace; 
  loaderTexture.texture[key] = texturePath;
})

// Store reference to clickable screen for positioning
let clickableScreenMesh = null;

window.addEventListener("mousemove", (e)=>{
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;
})

async function loadCustomFonts() {
  const fonts = [
    new FontFace('Searider Falcon Hollow', 'url(./fonts/SeariderFalcon3DHollow.ttf)', {
      weight: 'normal',
      style: 'normal'
    }),
    new FontFace('Searider Falcon', 'url(./fonts/SeariderFalcon3D.ttf)', {
      weight: 'normal',
      style: 'normal'
    }),
    new FontFace('Conthrax', 'url(./fonts/Conthrax-SemiBold.otf)', {
      weight: 'normal',
      style: 'normal'
    }),
    new FontFace('SeariderFalconPunch', 'url(./fonts/SeariderFalconPunch.otf)', {
      weight: 'normal',
      style: 'normal'
    }),
  ];

  try {
    // Load all fonts
    const loadedFonts = await Promise.all(
      fonts.map(font => font.load())
    );

    // Add fonts to document
    loadedFonts.forEach(font => {
      document.fonts.add(font);
    });

    return true;
  } catch (error) {
    console.warn('Failed to load custom fonts:', error);
    return false;
  }
}

async function loadSVGIcon(iconPath) {
  try {
    const response = await fetch(iconPath);
    const svgText = await response.text();
    
    // Create an image from the SVG
    const img = new Image();
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  } catch (error) {
    console.warn(`Failed to load SVG icon: ${iconPath}`, error);
    return null;
  }
}

const iconCache = {};

async function loadSocialIcons() {
  const iconPaths = [
    { name: 'linkedin', path: '/icons/linkedin-color.svg' },
    { name: 'github', path: '/icons/github.svg' },
    { name: 'email', path: '/icons/gmail.svg' },
  ];

  const loadPromises = iconPaths.map(async (icon) => {
    const img = await loadSVGIcon(icon.path);
    if (img) {
      iconCache[icon.name] = img;
    }
    return { name: icon.name, loaded: !!img };
  });

  const results = await Promise.all(loadPromises);
  return iconCache;
}


// Create 3D UI Screen using Canvas texture
// Create 3D UI Screen using Canvas texture with improved sharpness 2048, 1024
function createUITexture(width = 2048, height = 1024, content = {}) {
  const canvas = document.createElement('canvas');
  
  // Higher resolution for sharper text
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  const ctx = canvas.getContext('2d');
  // Scale context to match device pixel ratio
  ctx.scale(scale, scale);
  
  // Enable text smoothing
  ctx.textRenderingOptimization = 'optimizeQuality';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Create a vertical linear gradient for the background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1c2d49'); // Starting color (top)
  gradient.addColorStop(1, '#0a121b'); // Ending color (bottom)

  // Apply the gradient
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
    
  // Handle project detail view
  if (content.projectDetail) {
    renderProjectDetail(ctx, width, height, content.projectDetail);
    return createTextureFromCanvas(canvas);
  }
  
  // Title with better font rendering
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 125px "Searider Falcon Hollow"';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  // Add text shadow for better contrast
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  
  ctx.fillText(content.title || 'About', width * 0.991, 70);
  
  // Reset shadow for other elements
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Content based on section type
  if (content.type === 'skills') {
    renderSkillsContent(ctx, width, height);
  } else if (content.type === 'experience') {
    renderExperienceContent(ctx, width, height);
  } else {
    renderAboutContent(ctx, width, height);
  }
  
  // Back button (only show if not in project detail)
  ctx.fillStyle = '#BE2528';
  ctx.font = 'bold 50px "Searider Falcon"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Back', 140, 65);
  
  // Side navigation
  const navItems = ['About', 'Skills', 'Experience'];
  navItems.forEach((item, index) => {
    const y = 780 + (index * 80);
    ctx.save();
    ctx.translate(width - 40, y + 25);
    const isActive = content.activeNav && content.activeNav.toLowerCase() === item.toLowerCase();
    ctx.fillStyle = isActive ? '#00ffff' : '#ffffff';
    ctx.font = '30px "Searider Falcon"';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(item, 0, 0);
    ctx.restore();
  });
  
  return createTextureFromCanvas(canvas);
}

function createTextureFromCanvas(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBAFormat;
  texture.colorSpace = THREE.SRGBColorSpace; 
  texture.needsUpdate = true;
  return texture;
}

function renderAboutContent(ctx, width, height) {
  // Main content with improved typography
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '30px "Conthrax"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Add subtle text shadow for better readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  const lines = [
    "Hi, I'm Farhan.",
    "",
    "I'm a full-stack developer driven by a passion for",
    "building complete, user-focused applications. My focus",
    "is on creating engaging, responsive interfaces that make",
    "complex functionalities feel simple and accessible.",
    "",
    "To achieve this, my goal is to bridge the gap between",
    "creative design and robust back-end engineering.",
    "This ensures a great user experience is supported",
    "by a secure, reliable, and scalable foundation.",
    "",
    "Thanks for visiting!"
  ];
  
  let yPos = 200;
  const lineHeight = 38;
  lines.forEach(line => {
    ctx.fillText(line, 60, yPos);
    yPos += lineHeight;
  });
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Social media icons
  const iconY = height - 148;
  const iconSize = 80;
  const iconSpacing = 100;
  const startX = 60;

  // Simple placeholders for icons
  
  const socialMedia = [
    { name: 'linkedin', fallback: 'IN', url: 'https://linkedin.com/in/farhan-adika-prastowo', color: '' },
    { name: 'github', fallback: 'GH', url: 'https://github.com/Fluorineheit', color: '#e5e5e5ff' },
    { name: 'email', fallback: '@', url: 'mailto:farhanadika7@gmail.com', color: '#ea4335' },
  ];
  
  socialMedia.forEach((social, index) => {
  const x = startX + (index * iconSpacing);
  
  const svgIcon = iconCache[social.name];
  if (svgIcon) {
    const iconPadding = 20;
    const svgSize = iconSize - (iconPadding * 2);

    // Draw background circle
    ctx.fillStyle = social.color;
    ctx.beginPath();
    ctx.rect(x, iconY, iconSize, iconSize);
    ctx.fill();
  
    ctx.drawImage(
      svgIcon,
      x + iconPadding,
      iconY + iconPadding,
      svgSize,
      svgSize
    );
  }
});
}

// Updated social media click handler
function handleSocialMediaClick(index) {
  const socialMedia = [
    { name: 'linkedin', url: 'https://linkedin.com/in/farhan-adika-prastowo' },
    { name: 'github', url: 'https://github.com/Fluorineheit' },
    { name: 'email', url: 'mailto:farhanadika7@gmail.com' },
  ];
  
  if (socialMedia[index]) {
    window.open(socialMedia[index].url, '_blank');
  }
}

function renderSkillsContent(ctx, width, height) {
  // Left side - Skills overview paragraph
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '30px "Conthrax"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Add subtle text shadow for better readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  const skillsText = [
    "My Technical Arsenal",
    "",
    "I specialize in modern web development",
    "with a focus on creating seamless user",
    "experiences. My frontend expertise spans",
    "from responsive design to interactive",
    "3D experiences.",
    "",
    "On the backend, I build robust APIs",
    "and scalable architectures that power",
    "dynamic applications. I'm passionate",
    "about clean code, performance optimization,",
    "and staying current with emerging",
    "technologies."
  ];
  
  let yPos = 200;
  const lineHeight = 38;
  skillsText.forEach(line => {
    ctx.fillText(line, 60, yPos);
    yPos += lineHeight;
  });
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;


  // Skill categories data
  const skillCategories = [
    {
      skills: [
        { name: 'HTML5', color: '#e34f26' },
        { name: 'CSS3', color: '#264de4' },
        { name: 'JavaScript', color: '#f0db4f' },
        { name: 'Vue.js', color: '#42b883' },
        { name: 'React', color: '#61dafb' },
        { name: 'Tailwind', color: '#38bdf8' },
        { name: 'Node.js', color: '#68a063' },
        { name: 'PostgreSQL', color: '#336791' },
        { name: 'Git', color: '#f1502f' },
        { name: 'GitHub', color: '#e5e5e5ff' },
        { name: 'Figma', color: '#f24e1e' },
        { name: 'postman', color: '#ff6c37' },
        { name: 'Cypress', color: '#69D3A7' },
        { name: 'Blender', color: '#f5792a' },
      ]
    }
  ];

  const allSkills = skillCategories.reduce((acc, category) => {
    return acc.concat(category.skills.map(skill => ({
      ...skill,
    })));
  }, []);

  // Configure grid layout
  const columns = 4;
  const startX = width * 0.55;
  const startY = 200;
  const skillWidth = 120;
  const skillHeight = 100;
  const gapX = 90;
  const gapY = 15;

  // Draw each skill
  allSkills.forEach((skill, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    const x = startX + (col * (skillWidth + gapX));
    const y = startY + (row * (skillHeight + gapY));
    
    // Skill name
    ctx.fillStyle = skill.color || '#ffffff';
    ctx.font = '25px "Conthrax"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(skill.name, x + skillWidth/2, y + skillHeight - 25);
  });

  // Keep the bottom tagline
  const bottomY = height - 150;
  ctx.fillStyle = '#666';
  ctx.font = '20px "Conthrax"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Always learning, always building', width/2, bottomY);

}

const projectsData = [
  {
    id: 1,
    title: "Api Management",
    type: "Full-Stack Web App",
    technologies: ["Vue.js", "Node.js", "PostgreSQL", "Tailwind"],
    description: "An api management system to manage the api that is used in the Big Legal's system integrated with Express Gateaway.",
    longDescription: "The API management system developed for Big Legal's integrated system leverages Express Gateway for seamless integration and efficient management of APIs. Built with Vue.js and Quasar, it offers a dynamic and user-friendly interface, allowing administrators to easily monitor, secure, and scale APIs within the ecosystem. This system ensures smooth communication between various services while providing robust security measures and performance optimization, thus enhancing the overall functionality and reliability of the integrated platform.",
    image: "/projects/api-management.webp", 
    liveUrl: "",
    githubUrl: "",
    features: [
      "Centralized API Management",
      "Dynamic Admin Interface",
      "Robust Security & Optimization",
    ]
  },
  {
    id: 2,
    title: "Legal Reminder",
    type: "Full-Stack Web App",
    technologies: ["React Native", "Firebase", "Redux"],
    description: "A page to remind legal drafter about the deadline of the legal documents they are working on.",
    longDescription: "We're developing a sleek Vue-based platform using Quasar and JavaScript, tailored to remind legal drafters of impending deadlines for their documents. This project integrates seamlessly with Laravel for API modifications and employs Cypress for rigorous testing. We're organizing tasks via Trello, maintaining a clear backlog. Following the Scrum methodology, we conduct daily standups to ensure alignment and progress tracking. Our goal is to streamline the legal drafting process while enhancing accountability and efficiency.",
    image: "/projects/legal-reminder.webp",
    liveUrl: "",
    githubUrl: "",
    features: [
      "Automated Deadline Tracking",
      "Seamless Backend Integration",
      "Rigorous Quality Assurance",
    ]
  },
  {
    id: 3,
    title: "Knowledge Management System",
    type: "Full-Stack Web App",
    technologies: ["Vue.js", "Express Gateway", "ExpressJS", "Supabase", "Quasar"],
    longDescription: "I contributed across the full stack by pair-programming a robust ExpressJS and Supabase back-end and securing it with an API management system using Express Gateway that featured access control and rate-limiting. For the user interface, I developed an engaging chat bot with the Quasar framework to provide interactive support.",
    image: "/projects/kms.webp",
    features: [
      "Collaborative Back-End Development",
      "Secure API Management",
      "Interactive Chat Bot Interface",
    ]
  },
  {
    id: 4,
    title: "Portfolio Website",
    type: "3D Interactive Experience",
    technologies: ["Three.js", "JavaScript", "SCSS"],
    description: "An immersive 3D portfolio website showcasing projects through interactive environments and smooth animations.",
    longDescription: "Created an innovative portfolio website using Three.js to deliver an immersive 3D experience. Features interactive 3D environments, smooth camera animations, and dynamic UI overlays. The site showcases projects through engaging visual narratives while maintaining excellent performance and accessibility standards.",
    image: "/projects/portoweb.webp",
    liveUrl: "https://your-portfolio.com",
    githubUrl: "https://github.com/yourusername/portfolio",
    features: [
      "Interactive 3D environments",
      "Dynamic Camera & UI Overlays",
      "Optimized for Performance & Accessibility",
    ]
  },
  {
    id: 5,
    title: "handy Helper",
    type: "UI/UX Design",
    technologies: ["Figma", "Canva"],
    description: "A prototype of a handyman service app, focusing on the user experience and user interface design.",
    longDescription: "For a college project undertaken with my six-member team, we developed Handy Helper, a prototype of a handyman service app. Our primary focus was on refining the user experience and user interface design, leveraging Figma as our primary design tool. Employing quantitative research methods, we ensured every aspect of the app's design was meticulously crafted and backed by data. Additionally, we created a comprehensive demo using Figma, showcasing the app's functionality and features.",
    image: "/projects/handy-helper.webp",
    liveUrl: "https://drive.google.com/file/d/1RI4UnChkj3oAPXACf7XnJuakL6RKZrjJ/view",
    githubUrl: "https://www.figma.com/file/O80pbUm4DVENAMWPuvXOye/FarhanAdikaPrastowo_Portfolio_01?type=design&node-id=286-990&mode=design&t=orwqtFDMaKC9br1C-0",
    features: [
      "User-centric design",
      "Interactive prototypes",
      "Usability testing",
    ]
  },
];

// Current project detail state
let currentProjectDetail = null;

function renderExperienceContent(ctx, width, height) {
  // Left side - Experience overview
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '30px "Conthrax"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Add subtle text shadow for better readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  const experienceText = [
    "Project Showcase",
    "",
    "Here are some of the projects I've",
    "worked on that demonstrate my",
    "technical skills and creative approach",
    "to problem-solving.",
    "",
    "Each project represents a unique",
    "challenge and showcases different",
    "aspects of modern web development.",
    "Click on any project to learn more",
    "about the technologies used and",
    "the problems it solves."
  ];
  
  let yPos = 200;
  const lineHeight = 38;
  
  experienceText.forEach(line => {
    ctx.fillText(line, 60, yPos);
    yPos += lineHeight;
  });
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Right side - Project list
  const rightStartX = width * 0.55;
  const projectStartY = 200;
  const projectHeight = 160;
  const projectGap = 25;

  const numColumns = 2;
  const cardWidth = width * 0.19;
  const cardHeight = projectHeight; // Using your existing projectHeight
  const gapX = 30; // Horizontal space between cards
  const gapY = projectGap; // Vertical space between cards

  projectsData.slice(0, 6).forEach((project, index) => {
    const col = index % numColumns; 
    const row = Math.floor(index / numColumns); 

    const x = rightStartX + col * (cardWidth + gapX);
    const y = projectStartY + row * (cardHeight + gapY);
    
    ctx.fillStyle = '#1a2322';
    ctx.fillRect(x, y, cardWidth, cardHeight);
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardWidth, cardHeight);

    const maxTitleWidth = cardWidth - 40; // Padding of 20px on each side
    const titleWords = project.title.split(' ');
    let titleLine = '';
    let titleY = y + 23; // Starting Y position for title
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px "Searider Falcon"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let n = 0; n < titleWords.length; n++) {
        const testLine = titleLine + titleWords[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxTitleWidth && n > 0) {
            ctx.fillText(titleLine, x + 20, titleY);
            titleLine = titleWords[n] + ' ';
            titleY += 35; // Move to the next line
        } else {
            titleLine = testLine;
        }
    }
    ctx.fillText(titleLine, x + 20, titleY);
    
  //  Project type
  ctx.fillStyle = '#00ffff';
  ctx.font = '20px "Conthrax"';
  ctx.fillText(project.type, x + 20, titleY + 40);

});
}

function renderProjectDetail(ctx, width, height, project) {
  // Back to projects button
  ctx.fillStyle = '#BE2528';
  ctx.font = 'bold 40px "Searider Falcon"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Back to Projects', 60, 90);
  
  // Project title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px "Searider Falcon Hollow"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(project.title, 60, 150);
  
  // Project type
  ctx.fillStyle = '#00ffff';
  ctx.font = '30px "Conthrax"';
  ctx.fillText(project.type, 60, 250);

  if (project.image) {
    const img = new Image();
    img.src = project.image;

    // When the image finishes loading, draw it and update the texture
    img.onload = () => {


      // 1. Define the "bounding box" where the image should fit
    const boxX = width * 0.61;
    const boxY = 40;
    const boxWidth = width * 0.37;
    const boxHeight = 1000;

    const boxAspectRatio = boxWidth / boxHeight;
    const imageAspectRatio = img.width / img.height;
    
    let finalWidth, finalHeight;

    if (imageAspectRatio > boxAspectRatio) {
        finalWidth = boxWidth;
        finalHeight = finalWidth / imageAspectRatio;
    } else {
        finalHeight = boxHeight;
        finalWidth = finalHeight * imageAspectRatio;
    }
    const finalX = boxX + (boxWidth - finalWidth) / 2;
    const finalY = boxY + (boxHeight - finalHeight) / 2;

    ctx.drawImage(img, finalX, finalY, finalWidth, finalHeight);

    if (currentUIScreen) {
        currentUIScreen.material.map.needsUpdate = true;
    }
    };
  }
  
  // Technologies used
  ctx.fillStyle = '#ffffff';
  ctx.font = '25px "Conthrax"';
  ctx.fillText('Technologies:', 60, 300);
  
  const techY = 340;
  let currentX = 60; // for tracking the horizontal position
  const padding = 40; 

  project.technologies.forEach((tech, index) => {
    const techText = `• ${tech}`;
    ctx.fillStyle = '#00ffff';
    ctx.fillText(techText, currentX, techY);
    const textWidth = ctx.measureText(techText).width;
    currentX += textWidth + padding; // Update X position for next tech
  });
  
  // Project description
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '22px "Conthrax"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Word wrap for long description
  const words = project.longDescription.split(' ');
  const maxWidth = width * 0.56;
  let line = '';
  let y = 390;
  const lineHeight = 35;
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, 60, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, 60, y);
  y += lineHeight * 1.3;
  
  // Key features
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px "Conthrax"';
  ctx.fillText('Key Features:', 60, y);
  y += 50;
  
  ctx.fillStyle = '#ccc';
  ctx.font = '20px "Conthrax"';
  project.features.forEach((feature) => {
    ctx.fillText(`• ${feature}`, 60, y);
    y += 50;
  });
  
  // Links section
  let linksY = height - 177; // This is a fixed vertical position
  ctx.fillStyle = '#00ffff';
  ctx.font = '22.5px "Conthrax"';
  
  if (project.liveUrl) {
    ctx.fillText('🔗 View Live Project', 32, linksY);
    linksY += 32;
  }
  
  if (project.githubUrl) {
    ctx.fillText('💻 View Source Code', 32, linksY);
  }
}

// Modify your initializeApp function

async function initializeApp() {
    if (window.loadingScreen) {
        window.loadingScreen.updateProgress(5, 'Loading custom fonts...');
    }
    await loadCustomFonts();
    
    if (window.loadingScreen) {
        window.loadingScreen.updateProgress(15, 'Loading social media icons...');
    }
    await loadSocialIcons();
  
}

// Call this instead of directly running your code
initializeApp();

// Create 3D UI Screen
function create3DUIScreen(position, rotation, scale = [4, 3, 1]) {
  const geometry = new THREE.PlaneGeometry(scale[0], scale[1]);
  const uiWidth = 2048 * (scale[0] / scale[1]);
  const uiHeight = 2048;
  const texture = createUITexture(uiWidth, uiHeight);
  const material = new THREE.MeshBasicMaterial({ 
    map: texture, 
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);
  mesh.name = "UIScreen";
  
  // Create invisible hitboxes for interactive elements
  const hitboxes = createUIHitboxes(mesh, scale);
  
  return { mesh, hitboxes };
}

// Create invisible hitboxes for UI elements
// Updated createUIHitboxes function with correct positioning
function createUIHitboxes(parentMesh, scale) {
  const hitboxes = [];
  const DEBUG_HITBOXES = false; // Set to true to visualize hitboxes
  
  // Project detail hitboxes (back button and links)
  if (currentProjectDetail) {
    // Back to projects button
    const backToProjectsGeometry = new THREE.PlaneGeometry(3.2, 0.4);
    const backToProjectsMaterial = new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: DEBUG_HITBOXES ? 0.3 : 0,
      color: DEBUG_HITBOXES ? 0xff00ff : 0x000000,
      side: THREE.DoubleSide
    });
    const backToProjectsHitbox = new THREE.Mesh(backToProjectsGeometry, backToProjectsMaterial);
    backToProjectsHitbox.position.set(-3.6, 2.4, 0.03);
    backToProjectsHitbox.name = "BackToProjects";
    parentMesh.add(backToProjectsHitbox);
    hitboxes.push(backToProjectsHitbox);
    
    // Project links hitboxes
    let linkY = -1.94;
    if (currentProjectDetail.liveUrl) {
      const liveLinkGeometry = new THREE.PlaneGeometry(2.0, 0.1);
      const liveLinkMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: DEBUG_HITBOXES ? 0.3 : 0,
        color: DEBUG_HITBOXES ? 0x00ffff : 0x000000,
        side: THREE.DoubleSide
      });
      const liveLinkHitbox = new THREE.Mesh(liveLinkGeometry, liveLinkMaterial);
      liveLinkHitbox.position.set(-4.15, linkY, 0.03);
      liveLinkHitbox.name = "LiveProject" ;
      parentMesh.add(liveLinkHitbox);
      hitboxes.push(liveLinkHitbox);
      linkY -= 0.4;
    }
    
    if (currentProjectDetail.githubUrl) {
      const githubLinkGeometry = new THREE.PlaneGeometry(2.3, 0.1);
      const githubLinkMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: DEBUG_HITBOXES ? 0.3 : 0,
        color: DEBUG_HITBOXES ? 0x00ffff : 0x000000,
        side: THREE.DoubleSide
      });
      const githubLinkHitbox = new THREE.Mesh(githubLinkGeometry, githubLinkMaterial);
      githubLinkHitbox.position.set(-4, linkY + 0.2, 0.03);
      githubLinkHitbox.name = "GithubProject";
      parentMesh.add(githubLinkHitbox);
      hitboxes.push(githubLinkHitbox);
    }
  } else {
    // Back button hitbox
    const backGeometry = new THREE.PlaneGeometry(1.4, 0.31);
    const backMaterial = new THREE.MeshBasicMaterial({ 
    transparent: true, 
    opacity: DEBUG_HITBOXES ? 0.3 : 0,
    color: DEBUG_HITBOXES ? 0xff0000 : 0x000000,
    side: THREE.DoubleSide
  });
  const backHitbox = new THREE.Mesh(backGeometry, backMaterial);
  backHitbox.position.set(-4.55, 2.55, 0.03);
  backHitbox.name = "BackButton";
  parentMesh.add(backHitbox);
  hitboxes.push(backHitbox);
  
  // Navigation hitboxes
  const navItems = ['About', 'Skills', 'Experience'];
  navItems.forEach((item, index) => {
    const navGeometry = new THREE.PlaneGeometry(1.4, 0.3);
    const navMaterial = new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: DEBUG_HITBOXES ? 0.3 : 0,
      color: DEBUG_HITBOXES ? 0x00ff00 : 0x000000,
      side: THREE.DoubleSide
    });
    const navHitbox = new THREE.Mesh(navGeometry, navMaterial);
    
    const canvasY = 1600 + (index * 160);
    const normalizedY = canvasY / 2048;
    const meshY = 2.935 - (normalizedY * 5.87);
    
    navHitbox.position.set(4.5, meshY, 0.03);
    navHitbox.name = `Nav_${item}`;
    navHitbox.visible = DEBUG_HITBOXES;
    parentMesh.add(navHitbox);
    hitboxes.push(navHitbox);
  });
  }
    
  // Project hitboxes (only for experience section)
  if (currentUIScreen && currentUIScreen.userData.currentSection === 'experience' && !currentProjectDetail) {
    const numColumns = 2;
    const canvasWidth = 3746;
    const canvasHeight = 2048;
    const meshWidth = 10.73;
    const meshHeight = 5.87;

    const rightStartX = canvasWidth * 0.55;
    const projectStartY = 400;

    const cardWidthCanvas = canvasWidth * 0.19;
    const cardHeightCanvas = 280; 
    const gapX = 30;
    const gapY = 100;

    const hitboxWidth3D = (cardWidthCanvas / canvasWidth) * meshWidth;
    const hitboxHeight3D = (cardHeightCanvas / canvasHeight) * meshHeight;

    projectsData.slice(0, 6).forEach((project, index) => {
        const col = index % numColumns;
        const row = Math.floor(index / numColumns);

        const cardCenterX = rightStartX + col * (cardWidthCanvas + gapX) + (cardWidthCanvas / 2);
        const cardCenterY = projectStartY + row * (cardHeightCanvas + gapY) + (cardHeightCanvas / 2);

        const meshX = ((cardCenterX / canvasWidth) - 0.5) * meshWidth;
        const meshY = ((0.5 - (cardCenterY / canvasHeight))) * meshHeight;

        const projectGeometry = new THREE.PlaneGeometry(hitboxWidth3D, hitboxHeight3D);
        const projectMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: DEBUG_HITBOXES ? 0.3 : 0,
            color: DEBUG_HITBOXES ? 0xffff00 : 0x000000,
            side: THREE.DoubleSide
        });
        const projectHitbox = new THREE.Mesh(projectGeometry, projectMaterial);

        projectHitbox.position.set(meshX, meshY, 0.03);
        projectHitbox.name = `Project_${project.id}`;
        projectHitbox.visible = DEBUG_HITBOXES;
        parentMesh.add(projectHitbox);
        hitboxes.push(projectHitbox);
        });
      }
    
  // Social media hitboxes (only for about section)
  if (currentUIScreen && currentUIScreen.userData.currentSection === 'about' && !currentProjectDetail) {
    for(let i = 0; i < 3; i++) {
      const socialGeometry = new THREE.PlaneGeometry(0.5, 0.5);
      const socialMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: DEBUG_HITBOXES ? 0.3 : 0,
        color: DEBUG_HITBOXES ? 0x0000ff : 0x000000,
        side: THREE.DoubleSide
      });
      const socialHitbox = new THREE.Mesh(socialGeometry, socialMaterial);
      socialHitbox.position.set(-4.875 + (i * 0.6), -2.45, 0.03);
      socialHitbox.name = `Social_${i}`;
      socialHitbox.visible = DEBUG_HITBOXES;
      socialHitbox.isSocial = true;
      parentMesh.add(socialHitbox);
      hitboxes.push(socialHitbox);
    }
  }
  
  return hitboxes;
}

// Function to show 3D UI
function show3DUI(screenObject) {
  if (currentUIScreen) return; // UI already shown
  
  // Get screen position and rotation
  const screenPosition = new THREE.Vector3();
  const screenRotation = new THREE.Euler();
  screenObject.getWorldPosition(screenPosition);
  screenObject.getWorldQuaternion(new THREE.Quaternion()).normalize();

  const degrees = 90;
  const radians = degrees * (Math.PI / 180);

  // Add the rotation to one of the axes
  screenRotation.y += radians;
  
  // Position UI slightly in front of the screen
  const uiPosition = screenPosition.clone();
  uiPosition.add(new THREE.Vector3(0.19, 0.16, 0)); // Offset forward
  
  // Create UI screen
  const { mesh: uiMesh } = create3DUIScreen(
    uiPosition, 
    screenRotation,
    [10.73, 5.87, 1] // Scale to match your screen size
  );

  uiMesh.material.opacity = 0;

  currentUIScreen = uiMesh;
  uiGroup.add(uiMesh);
  scene.add(uiGroup);
  // change it again to about
  updateUIContent('about');

  gsap.to(uiMesh.material, { 
    opacity: 1, 
    duration: 0.5, 
    delay: 0.1  
  });

}

// Function to hide 3D UI
function hide3DUI() {
   if (currentUIScreen) {
    const screenToFade = currentUIScreen;
    currentUIScreen = null; 
    gsap.to(screenToFade.material, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
            uiGroup.remove(screenToFade);
            uiGroup.clear(); 
            if (screenToFade.geometry) screenToFade.geometry.dispose();
            if (screenToFade.material) {
              if (screenToFade.material.map) screenToFade.material.map.dispose();
              screenToFade.material.dispose();
            }
        }
    });
  }
  
}

// Handle UI interactions
function handleUIClick(intersectedObject) {
  const objectName = intersectedObject.name;
  
  switch(objectName) {
    case 'BackButton':
      hide3DUI();
      resetCamera();
      break;
      
    case 'BackToProjects':
      currentProjectDetail = null;
      updateUIContent('experience');
      break;
      
    case 'LiveProject':
      if (currentProjectDetail && currentProjectDetail.liveUrl) {
        window.open(currentProjectDetail.liveUrl, '_blank');
      } else {

      }
      break;
      
    case 'GithubProject':
      if (currentProjectDetail && currentProjectDetail.githubUrl) {
        window.open(currentProjectDetail.githubUrl, '_blank');
      }
      break;
      
    case 'Nav_About':
      currentProjectDetail = null;
      updateUIContent('about');
      break;
      
    case 'Nav_Skills':
      currentProjectDetail = null;
      updateUIContent('skills');
      break;
      
    case 'Nav_Experience':
      currentProjectDetail = null;
      updateUIContent('experience');
      break;
      
    default:
      if(objectName.startsWith('Social_')) {
        handleSocialMediaClick(parseInt(objectName.split('_')[1]));
      } else if(objectName.startsWith('Project_')) {
        const projectId = parseInt(objectName.split('_')[1]);
        const project = projectsData.find(p => p.id === projectId);
        if (project) {
          currentProjectDetail = project;
          updateUIContent('experience');
        }
      }
      break;
  }
}

// Update UI content (recreate texture with new content)
function updateUIContent(section) {
  if (!currentUIScreen) return;
  
  let content = { activeNav: section };
  
  // Store current section in mesh userData
  currentUIScreen.userData.currentSection = section;
  
  if (currentProjectDetail) {
    content.projectDetail = currentProjectDetail;
    content.title = currentProjectDetail.title;
  } else {
    switch(section) {
      case 'about':
        content.title = 'About Me';
        content.type = 'about';
        break;
      case 'skills':
        content.title = 'My Skills';
        content.type = 'skills';
        break;
      case 'experience':
        content.title = 'Experience';
        content.type = 'experience';
        break;
    }
  }
  
  // Clear existing hitboxes
  while(currentUIScreen.children.length > 0){ 
    currentUIScreen.remove(currentUIScreen.children[0]); 
  }
  
  // Create new texture with updated content
  const newTexture = createUITexture(2048, 1024, content);
  currentUIScreen.material.map = newTexture;
  currentUIScreen.material.needsUpdate = true;
  
  // Add new hitboxes
  const newHitboxes = createUIHitboxes(currentUIScreen, [10.73, 5.87, 1]);
}

function getRaycastTargets() {
  if (currentUIScreen) {
    // Only raycast against the UI and its children (hitboxes)
    return [currentUIScreen, ...currentUIScreen.children];
  } else {
    // Raycast against the whole scene (default)
    return scene.children;
  }
}

// Click event listener
window.addEventListener("click", (e) => {
  if (isAnimating) return;
  
  rayCaster.setFromCamera(pointer, camera);
  // const intersects = rayCaster.intersectObjects(scene.children, true);
  const intersects = rayCaster.intersectObjects(getRaycastTargets(), true);
  
  for(let i = 0; i < intersects.length; i++){
    const intersectedObject = intersects[i].object;
    
    // Check for main screen click
    if(intersectedObject.name.includes("ClickableScreen_Raycaster")){
      zoomToScreen(intersectedObject);
      show3DUI(intersectedObject);
      break;
    }
    
    // Check for UI element clicks
    if(intersectedObject.parent && intersectedObject.parent.name === "UIScreen") {
      handleUIClick(intersectedObject);
      break;
    }
  }
});

// Add this near your other UI State variables
let projectScrollY = 0;

window.addEventListener('wheel', (event) => {
    // Only scroll if the UI is active and we're in the 'experience' section
    if (!currentUIScreen || currentUIScreen.userData.currentSection !== 'experience' || currentProjectDetail) {
      return;
    }

    // Update the scroll position
    projectScrollY += event.deltaY * 0.5; // Multiply for scroll speed control

    // --- Define Scroll Limits (Clamping) ---
    const projectHeight = 220; // As defined in your hitbox logic
    const visibleAreaHeight = 1500; // The pixel height of the scrollable area on the canvas
    const totalContentHeight = projectsData.length * projectHeight;
    const maxScroll = totalContentHeight - visibleAreaHeight;

    // Don't scroll past the top
    if (projectScrollY < 0) {
        projectScrollY = 0;
    }
    // Don't scroll past the bottom
    if (projectScrollY > maxScroll) {
        projectScrollY = maxScroll;
    }

    // Redraw the experience section with the new scroll position
    updateUIContent('experience');
});

// Function to animate camera to screen
function zoomToScreen(screenObject) {
  if (isAnimating) return;
  
  isAnimating = true;
  
  // Get the screen's world position
  const screenPosition = new THREE.Vector3();
  screenObject.getWorldPosition(screenPosition);
  
  controls.minDistance = 0;
  controls.maxDistance = Infinity;

  // Calculate optimal camera position (closer for UI interaction)
  // const targetCameraPosition = screenPosition.clone().add(new THREE.Vector3(0, 0, 6));
   const targetCameraPosition = new THREE.Vector3(
    11.806177745161065,
    12.94484623673,
    -4.594371204038005
  );
  
  // Animation parameters
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const endTarget = screenPosition.clone();
  
  let progress = 0;
  const duration = 1500; // 1.5 seconds
  const startTime = Date.now();
  
  function animateCamera() {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-in-out)
    const eased = progress * progress * (3 - 2 * progress);
    
    // Interpolate camera position
    camera.position.lerpVectors(startPosition, targetCameraPosition, eased);
    
    // Interpolate controls target
    controls.target.lerpVectors(startTarget, endTarget, eased);
    controls.update();
    
    if (progress < 1) {
      animationId = requestAnimationFrame(animateCamera);
      controls.enableRotate = false;
      controls.enableZoom = false;
    } else {
      isAnimating = false;
      animationId = null;

      // LOCK camera movement, allow zoom only
      controls.enableRotate = false;
      controls.enableZoom = true;
      controls.minDistance = 9; // adjust as needed
      controls.maxDistance = 15; // adjust as needed
    }
  }
  
  animateCamera();
}

// Function to reset camera to original position
function resetCamera() {
  if (isAnimating) return;
  
  isAnimating = true;
  
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();

  controls.minDistance = 0;
  controls.maxDistance = Infinity;
  
  let progress = 0;
  const duration = 1500;
  const startTime = Date.now();
  
  function animateReset() {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / duration, 1);
    
    const eased = progress * progress * (3 - 2 * progress);
    
    camera.position.lerpVectors(startPosition, originalCameraPosition, eased);
    controls.target.lerpVectors(startTarget, originalTarget, eased);
    controls.update();
    
    if (progress < 1) {
      animationId = requestAnimationFrame(animateReset);
    } else {
      isAnimating = false;
      animationId = null;

      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.minDistance = 20; // Min zoom in
      controls.maxDistance = 45; // Max zoom out
    }
  }
  
  animateReset();
}

// Enhanced cursor detection for UI elements
function updateCursor() {
  rayCaster.setFromCamera(pointer, camera);
  const intersects = rayCaster.intersectObjects(getRaycastTargets(), true);
  
  let isHovering = false;
  
  for(let i = 0; i < intersects.length; i++){
    
    const intersectedObject = intersects[i].object;
    
    // Check for main screen
    if(intersectedObject.name.includes("ClickableScreen_Raycaster")){
      isHovering = true;
      break;
    }
    
    // Check for UI elements
    if(intersectedObject.parent && intersectedObject.parent.name === "UIScreen") {
      isHovering = true;
      
      // Optional: Add hover effects to UI elements
      if(intersectedObject.name === 'BackButton') {
        // Could add glow effect or texture change here
      }
      break;
    }
  }
  
  document.body.style.cursor = isHovering ? "pointer" : "default";
}

loader.load('models/porto-ril.glb', (glb) =>  {
  glb.scene.traverse((child) => {
    if (child.isMesh) {
      Object.keys(textureMap).forEach((key) => {
        if(child.name.toLowerCase().includes(key.toLowerCase())){
          const material = new THREE.MeshBasicMaterial({
            map: loaderTexture.texture[key],
          });

          // Store reference to clickable screen
          if(child.name.includes("ClickableScreen_Raycaster")){
            clickableScreenMesh = child;
          }
          
          child.material = material
        }
      })
    }
  });
  scene.add(glb.scene);
})

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 
  75, 
  sizes.width / sizes.height, 
  1, 
  200 
);

camera.position.set( 24.45732511317063, 4.914951810646316, 15.36648732308515 );

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.update();
controls.target.set(-1, 6, -0.18277228675437365)

const minTargetY = 6;
const minTargetX = 1;
const maxTargetX = -1;

controls.addEventListener('change', () => {
  
  if (controls.target.y < minTargetY) {
    controls.target.y = minTargetY;
  }
  if (controls.target.x < minTargetX) {
    controls.target.x = minTargetX;
  }
  if (controls.target.x > maxTargetX) {
    controls.target.x = maxTargetX;
  }
});

controls.maxPolarAngle = 1.7  ; // Limit vertical rotation to prevent going below ground
controls.minPolarAngle = 0; // Prevent looking directly up

controls.minDistance = 20; // Min zoom in
controls.maxDistance = 45; // Max zoom out


// event listener
window.addEventListener("resize", ()=>{
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  
  // update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
})

const render = () =>{
  controls.update();
  renderer.render( scene, camera );
  updateCursor();
  
  window.requestAnimationFrame(render);
} 

render()