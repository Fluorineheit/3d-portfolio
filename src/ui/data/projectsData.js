// src/ui/data/projectsData.js

export const projectsData = [
  {
    id: 1,
    title: "Api Management",
    type: "Front-end Web App",
    technologies: ["Vue.js", "Express Gateaway", "Quasar"],
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
    technologies: ["Vue.js", "Quasar", "Javascript", "laravel", "Cypress"],
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
    type: "Full-stack Web App",
    technologies: ["React", "NextJS", "Supabase", "Express Gateaway"],
    longDescription: "I contributed across the full stack by pair-programming a robust NextJS and Supabase back-end and securing it with an API management system using Express Gateway that featured access control and rate-limiting. For the user interface, I developed an engaging chat bot with the Quasar framework to provide interactive support.",
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
    liveUrl: "https://fluorineheit.netlify.app/",
    githubUrl: "https://github.com/Fluorineheit/3d-portfolio/",
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

// Social media data
export const socialMediaData = [
  { 
    name: 'linkedin', 
    fallback: 'IN', 
    url: 'https://linkedin.com/in/farhan-adika-prastowo', 
    color: '' 
  },
  { 
    name: 'github', 
    fallback: 'GH', 
    url: 'https://github.com/Fluorineheit', 
    color: '#e5e5e5ff' 
  },
  { 
    name: 'email', 
    fallback: '@', 
    url: 'mailto:farhanadika7@gmail.com', 
    color: '#ea4335' 
  },
];

// Skills data
export const skillsData = [
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
];

// Content text data
export const contentData = {
  about: {
    title: "About Me",
    lines: [
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
    ]
  },
  skills: {
    title: "My Skills",
    lines: [
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
    ]
  },
  experience: {
    title: "Experience",
    lines: [
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
    ]
  }
};