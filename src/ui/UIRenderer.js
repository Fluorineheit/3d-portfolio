// src/ui/UIRenderer.js
import * as THREE from 'three';
import { projectsData, socialMediaData, skillsData, contentData } from './data/projectsData.js';

export class UIRenderer {
  constructor() {
    this.iconCache = {};
    this.currentProjectDetail = null;
    this.projectScrollY = 0;
    this.imageCache = {}; // Add image cache
  }

  // Set icon cache from external source
  setIconCache(iconCache) {
    this.iconCache = iconCache;
  }

  // Preload project images
  async preloadProjectImages() {
    const imagePromises = projectsData
      .filter(project => project.image)
      .map(project => this.loadImage(project.image, project.id));
    
    await Promise.all(imagePromises);
  }

  // Load single image and cache it
  loadImage(src, projectId) {
    return new Promise((resolve, reject) => {
      if (this.imageCache[projectId]) {
        resolve(this.imageCache[projectId]);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous'; // For CORS if needed
      img.onload = () => {
        this.imageCache[projectId] = img;
        resolve(img);
      };
      img.onerror = (error) => {
        console.warn(`Failed to load image: ${src}`, error);
        resolve(null); // Resolve with null instead of rejecting
      };
      img.src = src;
    });
  }

  // Set current project detail
  setCurrentProjectDetail(project) {
    this.currentProjectDetail = project;
  }

  // Get current project detail
  getCurrentProjectDetail() {
    return this.currentProjectDetail;
  }

  // Create 3D UI texture - now async to handle images
  async createUITexture(width = 2048, height = 1024, content = {}) {
    const canvas = document.createElement('canvas');
    
    // Higher resolution for sharper text
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    
    // Enable text smoothing
    ctx.textRenderingOptimization = 'optimizeQuality';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Create background gradient
    this.createBackground(ctx, width, height);
    
    // Handle project detail view
    if (content.projectDetail) {
      await this.renderProjectDetail(ctx, width, height, content.projectDetail);
      return this.createTextureFromCanvas(canvas);
    }
    
    // Render title and navigation
    this.renderTitleAndNav(ctx, width, height, content);
    
    // Render content based on section type
    if (content.type === 'skills') {
      this.renderSkillsContent(ctx, width, height);
    } else if (content.type === 'experience') {
      this.renderExperienceContent(ctx, width, height);
    } else {
      this.renderAboutContent(ctx, width, height);
    }
    
    return this.createTextureFromCanvas(canvas);
  }

  // Create background gradient
  createBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1c2d49');
    gradient.addColorStop(1, '#0a121b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Render title and navigation
  renderTitleAndNav(ctx, width, height, content) {
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
    
    // Back button
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
  }

  // Create texture from canvas
  createTextureFromCanvas(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  // Render about content
  renderAboutContent(ctx, width, height) {
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
    
    const lines = contentData.about.lines;
    
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
    
    // Render social media icons
    this.renderSocialMediaIcons(ctx, width, height);
  }

  // Render social media icons
  renderSocialMediaIcons(ctx, width, height) {
    const iconY = height - 148;
    const iconSize = 80;
    const iconSpacing = 100;
    const startX = 60;

    socialMediaData.forEach((social, index) => {
      const x = startX + (index * iconSpacing);
      
      const svgIcon = this.iconCache[social.name];
      if (svgIcon) {
        const iconPadding = 20;
        const svgSize = iconSize - (iconPadding * 2);

        // Draw background
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

  // Render skills content
  renderSkillsContent(ctx, width, height) {
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
    
    const skillsText = contentData.skills.lines;
    
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

    // Render skills grid
    this.renderSkillsGrid(ctx, width, height);

    // Keep the bottom tagline
    const bottomY = height - 150;
    ctx.fillStyle = '#666';
    ctx.font = '20px "Conthrax"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Always learning, always building', width/2, bottomY);
  }

  // Render skills grid
  renderSkillsGrid(ctx, width, height) {
    // Configure grid layout
    const columns = 4;
    const startX = width * 0.55;
    const startY = 200;
    const skillWidth = 120;
    const skillHeight = 100;
    const gapX = 90;
    const gapY = 15;

    // Draw each skill
    skillsData.forEach((skill, index) => {
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
  }

  // Render experience content
  renderExperienceContent(ctx, width, height) {
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
    
    const experienceText = contentData.experience.lines;
    
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

    // Render project cards
    this.renderProjectCards(ctx, width, height);
  }

  // Render project cards
  renderProjectCards(ctx, width, height) {
    const rightStartX = width * 0.55;
    const projectStartY = 200;
    const projectHeight = 160;
    const projectGap = 25;

    const numColumns = 2;
    const cardWidth = width * 0.19;
    const cardHeight = projectHeight;
    const gapX = 30;
    const gapY = projectGap;

    projectsData.slice(0, 6).forEach((project, index) => {
      const col = index % numColumns; 
      const row = Math.floor(index / numColumns); 

      const x = rightStartX + col * (cardWidth + gapX);
      const y = projectStartY + row * (cardHeight + gapY);
      
      // Card background
      ctx.fillStyle = '#1a2322';
      ctx.fillRect(x, y, cardWidth, cardHeight);
      
      // Card border
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardWidth, cardHeight);

      // Project title with text wrapping
      const maxTitleWidth = cardWidth - 40;
      const titleWords = project.title.split(' ');
      let titleLine = '';
      let titleY = y + 23;
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
              titleY += 35;
          } else {
              titleLine = testLine;
          }
      }
      ctx.fillText(titleLine, x + 20, titleY);
      
      // Project type
      ctx.fillStyle = '#00ffff';
      ctx.font = '20px "Conthrax"';
      ctx.fillText(project.type, x + 20, titleY + 40);
    });
  }

  // Render project detail - now async
  async renderProjectDetail(ctx, width, height, project) {
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

    // Project image - now synchronous since we preloaded
    await this.renderProjectImage(ctx, width, height, project);
    
    // Technologies used
    this.renderTechnologies(ctx, project);
    
    // Project description
    const descEndY = this.renderProjectDescription(ctx, width, project);
    
    // Key features
    this.renderKeyFeatures(ctx, descEndY, project);
    
    // Project links
    this.renderProjectLinks(ctx, height, project);
  }

  // Render project image - now async and uses cached images
  async renderProjectImage(ctx, width, height, project) {
    if (!project.image) return;

    // Try to get cached image first
    let img = this.imageCache[project.id];
    
    // If not cached, load it now
    if (!img) {
      img = await this.loadImage(project.image, project.id);
    }

    if (img) {
      const boxX = width * 0.61;
      const boxY = height * 0.25;
      const boxWidth = width * 0.35;
      const boxHeight = 600;

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

      try {
        ctx.drawImage(img, finalX, finalY, finalWidth, finalHeight);
      } catch (error) {
        console.warn('Failed to draw image:', error);
        // Draw placeholder rectangle
        ctx.fillStyle = '#333';
        ctx.fillRect(finalX, finalY, finalWidth, finalHeight);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(finalX, finalY, finalWidth, finalHeight);
      }
    } 
  }

  // Render technologies
  renderTechnologies(ctx, project) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '25px "Conthrax"';
    ctx.fillText('Technologies:', 60, 300);
    
    const techY = 340;
    let currentX = 60;
    const padding = 40; 

    project.technologies.forEach((tech, index) => {
      const techText = `• ${tech}`;
      ctx.fillStyle = '#00ffff';
      ctx.fillText(techText, currentX, techY);
      const textWidth = ctx.measureText(techText).width;
      currentX += textWidth + padding;
    });
  }

  // Render project description with word wrapping
  renderProjectDescription(ctx, width, project) {
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
    return y + lineHeight * 1.3;
  }

  // Render key features
  renderKeyFeatures(ctx, height, project) {
    let y = height + 15
    
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

    return y
  }

  // Render project links
  renderProjectLinks(ctx, height, project) {
    let linksY = height - 177;
    let linksX = 50
    ctx.fillStyle = '#00ffff';
    ctx.font = '22.5px "Conthrax"';
    
    if (project.liveUrl) {
      ctx.fillText('🔗 View Live Project', linksX, linksY);
      linksY += 32;
    }
    
    if (project.githubUrl) {
      ctx.fillText('💻 View Source Code', linksX, linksY);
    }
  }

  // Handle scroll for projects
  handleScroll(deltaY) {
    this.projectScrollY += deltaY * 0.5;
    
    const projectHeight = 220;
    const visibleAreaHeight = 1500;
    const totalContentHeight = projectsData.length * projectHeight;
    const maxScroll = totalContentHeight - visibleAreaHeight;

    if (this.projectScrollY < 0) {
        this.projectScrollY = 0;
    }
    if (this.projectScrollY > maxScroll) {
        this.projectScrollY = maxScroll;
    }

    return this.projectScrollY;
  }

  // Get project data by ID
  getProjectById(id) {
    return projectsData.find(p => p.id === id);
  }

  // Get all projects data
  getProjectsData() {
    return projectsData;
  }

  // Get social media data
  getSocialMediaData() {
    return socialMediaData;
  }

  // Get debug information
  getDebugInfo() {
    return {
      cachedImages: Object.keys(this.imageCache).length,
      currentProject: this.currentProjectDetail?.title || null,
      projectScrollY: this.projectScrollY
    };
  }
}