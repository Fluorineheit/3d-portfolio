// src/ui/UIInteractions.js
import * as THREE from 'three';
import { projectsData, socialMediaData } from './data/projectsData.js';

export class UIInteractions {
  constructor() {
    this.DEBUG_HITBOXES = false; // Set to true to visualize hitboxes
    this.currentUIScreen = null;
    this.currentProjectDetail = null;
  }

  // Set debug mode for hitboxes
  setDebugMode(debug) {
    this.DEBUG_HITBOXES = debug;
  }

  // Set current UI screen reference
  setCurrentUIScreen(screen) {
    this.currentUIScreen = screen;
  }

  // Set current project detail
  setCurrentProjectDetail(project) {
    this.currentProjectDetail = project;
  }

  // Create invisible hitboxes for UI elements
  createUIHitboxes(parentMesh, scale) {
    const hitboxes = [];
    
    // Project detail hitboxes (back button and links)
    if (this.currentProjectDetail) {
      this.createProjectDetailHitboxes(parentMesh, hitboxes);
    } else {
      this.createMainUIHitboxes(parentMesh, hitboxes, scale);
    }
    
    return hitboxes;
  }

  // Create hitboxes for project detail view
  createProjectDetailHitboxes(parentMesh, hitboxes) {
    // Back to projects button
    const backToProjectsGeometry = new THREE.PlaneGeometry(3.2, 0.4);
    const backToProjectsMaterial = new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: this.DEBUG_HITBOXES ? 0.3 : 0,
      color: this.DEBUG_HITBOXES ? 0xff00ff : 0x000000,
      side: THREE.DoubleSide
    });
    const backToProjectsHitbox = new THREE.Mesh(backToProjectsGeometry, backToProjectsMaterial);
    backToProjectsHitbox.position.set(-3.6, 2.4, 0.03);
    backToProjectsHitbox.name = "BackToProjects";
    parentMesh.add(backToProjectsHitbox);
    hitboxes.push(backToProjectsHitbox);
    
    // Project links hitboxes
    let linkY = -1.94;
    if (this.currentProjectDetail.liveUrl) {
      const liveLinkGeometry = new THREE.PlaneGeometry(2.0, 0.1);
      const liveLinkMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: this.DEBUG_HITBOXES ? 0.3 : 0,
        color: this.DEBUG_HITBOXES ? 0x00ffff : 0x000000,
        side: THREE.DoubleSide
      });
      const liveLinkHitbox = new THREE.Mesh(liveLinkGeometry, liveLinkMaterial);
      liveLinkHitbox.position.set(-4.15, linkY, 0.03);
      liveLinkHitbox.name = "LiveProject";
      parentMesh.add(liveLinkHitbox);
      hitboxes.push(liveLinkHitbox);
      linkY -= 0.4;
    }
    
    if (this.currentProjectDetail.githubUrl) {
      const githubLinkGeometry = new THREE.PlaneGeometry(2.3, 0.1);
      const githubLinkMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: this.DEBUG_HITBOXES ? 0.3 : 0,
        color: this.DEBUG_HITBOXES ? 0x00ffff : 0x000000,
        side: THREE.DoubleSide
      });
      const githubLinkHitbox = new THREE.Mesh(githubLinkGeometry, githubLinkMaterial);
      githubLinkHitbox.position.set(-4, linkY + 0.2, 0.03);
      githubLinkHitbox.name = "GithubProject";
      parentMesh.add(githubLinkHitbox);
      hitboxes.push(githubLinkHitbox);
    }
  }

  // Create hitboxes for main UI view
  createMainUIHitboxes(parentMesh, hitboxes, scale) {
    // Back button hitbox
    const backGeometry = new THREE.PlaneGeometry(1.4, 0.31);
    const backMaterial = new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: this.DEBUG_HITBOXES ? 0.3 : 0,
      color: this.DEBUG_HITBOXES ? 0xff0000 : 0x000000,
      side: THREE.DoubleSide
    });
    const backHitbox = new THREE.Mesh(backGeometry, backMaterial);
    backHitbox.position.set(-4.55, 2.55, 0.03);
    backHitbox.name = "BackButton";
    parentMesh.add(backHitbox);
    hitboxes.push(backHitbox);
    
    // Navigation hitboxes
    this.createNavigationHitboxes(parentMesh, hitboxes);
    
    // Section-specific hitboxes
    this.createSectionSpecificHitboxes(parentMesh, hitboxes, scale);
  }

  // Create navigation hitboxes
  createNavigationHitboxes(parentMesh, hitboxes) {
    const navItems = ['About', 'Skills', 'Experience'];
    navItems.forEach((item, index) => {
      const navGeometry = new THREE.PlaneGeometry(1.4, 0.3);
      const navMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: this.DEBUG_HITBOXES ? 0.3 : 0,
        color: this.DEBUG_HITBOXES ? 0x00ff00 : 0x000000,
        side: THREE.DoubleSide
      });
      const navHitbox = new THREE.Mesh(navGeometry, navMaterial);
      
      const canvasY = 1600 + (index * 160);
      const normalizedY = canvasY / 2048;
      const meshY = 2.935 - (normalizedY * 5.87);
      
      navHitbox.position.set(4.5, meshY, 0.03);
      navHitbox.name = `Nav_${item}`;
      navHitbox.visible = this.DEBUG_HITBOXES;
      parentMesh.add(navHitbox);
      hitboxes.push(navHitbox);
    });
  }

  // Create section-specific hitboxes
  createSectionSpecificHitboxes(parentMesh, hitboxes, scale) {
    if (!this.currentUIScreen) return;

    const currentSection = this.currentUIScreen.userData.currentSection;
    
    // Project hitboxes (only for experience section)
    if (currentSection === 'experience' && !this.currentProjectDetail) {
      this.createProjectHitboxes(parentMesh, hitboxes, scale);
    }
    
    // Social media hitboxes (only for about section)
    if (currentSection === 'about' && !this.currentProjectDetail) {
      this.createSocialMediaHitboxes(parentMesh, hitboxes);
    }
  }

  // Create project hitboxes for experience section
  createProjectHitboxes(parentMesh, hitboxes, scale) {
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
            opacity: this.DEBUG_HITBOXES ? 0.3 : 0,
            color: this.DEBUG_HITBOXES ? 0xffff00 : 0x000000,
            side: THREE.DoubleSide
        });
        const projectHitbox = new THREE.Mesh(projectGeometry, projectMaterial);

        projectHitbox.position.set(meshX, meshY, 0.03);
        projectHitbox.name = `Project_${project.id}`;
        projectHitbox.visible = this.DEBUG_HITBOXES;
        parentMesh.add(projectHitbox);
        hitboxes.push(projectHitbox);
    });
  }

  // Create social media hitboxes for about section
  createSocialMediaHitboxes(parentMesh, hitboxes) {
    for(let i = 0; i < 3; i++) {
      const socialGeometry = new THREE.PlaneGeometry(0.5, 0.5);
      const socialMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: this.DEBUG_HITBOXES ? 0.3 : 0,
        color: this.DEBUG_HITBOXES ? 0x0000ff : 0x000000,
        side: THREE.DoubleSide
      });
      const socialHitbox = new THREE.Mesh(socialGeometry, socialMaterial);
      socialHitbox.position.set(-4.8 + (i * 0.55), -2.30, 0.03);
      socialHitbox.name = `Social_${i}`;
      socialHitbox.visible = this.DEBUG_HITBOXES;
      socialHitbox.isSocial = true;
      parentMesh.add(socialHitbox);
      hitboxes.push(socialHitbox);
    }
  }

  // Handle UI click interactions
  handleUIClick(intersectedObject, callbacks = {}) {
    const objectName = intersectedObject.name;
    
    switch(objectName) {
      case 'BackButton':
        if (callbacks.onBackToScene) {
          callbacks.onBackToScene();
        }
        break;
        
      case 'BackToProjects':
        this.currentProjectDetail = null;
        if (callbacks.onBackToProjects) {
          callbacks.onBackToProjects();
        }
        break;
        
      case 'LiveProject':
        if (this.currentProjectDetail && this.currentProjectDetail.liveUrl) {
          window.open(this.currentProjectDetail.liveUrl, '_blank');
        }
        break;
        
      case 'GithubProject':
        if (this.currentProjectDetail && this.currentProjectDetail.githubUrl) {
          window.open(this.currentProjectDetail.githubUrl, '_blank');
        }
        break;
        
      case 'Nav_About':
        this.currentProjectDetail = null;
        if (callbacks.onNavigate) {
          callbacks.onNavigate('about');
        }
        break;
        
      case 'Nav_Skills':
        this.currentProjectDetail = null;
        if (callbacks.onNavigate) {
          callbacks.onNavigate('skills');
        }
        break;
        
      case 'Nav_Experience':
        this.currentProjectDetail = null;
        if (callbacks.onNavigate) {
          callbacks.onNavigate('experience');
        }
        break;
        
      default:
        if(objectName.startsWith('Social_')) {
          this.handleSocialMediaClick(parseInt(objectName.split('_')[1]));
        } else if(objectName.startsWith('Project_')) {
          const projectId = parseInt(objectName.split('_')[1]);
          const project = projectsData.find(p => p.id === projectId);
          if (project && callbacks.onProjectSelect) {
            this.currentProjectDetail = project;
            callbacks.onProjectSelect(project);
          }
        }
        break;
    }
  }

  // Handle social media clicks
  handleSocialMediaClick(index) {
    if (socialMediaData[index]) {
      window.open(socialMediaData[index].url, '_blank');
    }
  }

  // Get raycast targets for UI interaction
  getRaycastTargets() {
    if (this.currentUIScreen) {
      // Only raycast against the UI and its children (hitboxes)
      return [this.currentUIScreen, ...this.currentUIScreen.children];
    } else {
      // Return empty array when no UI is active
      return [];
    }
  }

  // Clear all hitboxes from current UI screen
  clearHitboxes() {
    if (this.currentUIScreen) {
      while(this.currentUIScreen.children.length > 0) { 
        this.currentUIScreen.remove(this.currentUIScreen.children[0]); 
      }
    }
  }

  // Check if click is on a specific UI element type
  isClickOnElement(objectName, elementType) {
    switch(elementType) {
      case 'navigation':
        return objectName.startsWith('Nav_');
      case 'project':
        return objectName.startsWith('Project_');
      case 'social':
        return objectName.startsWith('Social_');
      case 'back':
        return objectName === 'BackButton' || objectName === 'BackToProjects';
      case 'link':
        return objectName === 'LiveProject' || objectName === 'GithubProject';
      default:
        return false;
    }
  }

  // Get click coordinates relative to UI screen
  getUIClickCoordinates(intersect) {
    if (!intersect || !intersect.uv) return null;
    
    return {
      x: intersect.uv.x,
      y: intersect.uv.y,
      worldPosition: intersect.point
    };
  }

  // Enable/disable hitbox visibility for debugging
  toggleHitboxVisibility(visible) {
    this.DEBUG_HITBOXES = visible;
    if (this.currentUIScreen) {
      this.currentUIScreen.children.forEach(child => {
        if (child.material && child.material.opacity !== undefined) {
          child.material.opacity = visible ? 0.3 : 0;
        }
      });
    }
  }

  // Get current project detail
  getCurrentProjectDetail() {
    return this.currentProjectDetail;
  }

  // Reset interaction state
  reset() {
    this.currentProjectDetail = null;
    this.currentUIScreen = null;
  }

  // Get debug information
  getDebugInfo() {
    return {
      currentProjectDetail: this.currentProjectDetail?.title || null,
      hitboxesVisible: this.DEBUG_HITBOXES,
      currentUIScreen: this.currentUIScreen?.name || null,
      hitboxCount: this.currentUIScreen?.children.length || 0
    };
  }
}