'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Linkedin, 
  Github, 
  Globe,
  Calendar,
  Building2,
  GraduationCap,
  Award,
  Code2,
  Briefcase
} from "lucide-react";

interface Experience {
  title: string;
  company: string;
  location: string;
  period: string;
  achievements: string[];
  technologies: string[];
}

interface Education {
  degree: string;
  institution: string;
  location: string;
  period: string;
  details?: string[];
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  highlights: string[];
  link?: string;
}

const resumeData = {
  personalInfo: {
    name: "Dapal Glevinzon",
    title: "Frontend Software Engineer",
    email: "glevinzond@gmail.com",
    phone: "+63 995 568 8929",
    location: "Davao City, Philippines",
    linkedin: "linkedin.com/in/glvnzn",
    github: "github.com/glvnzn",
    website: "glevinzon.dev"
  },
  
  summary: "Dedicated Frontend Software Engineer with 7+ years of React.js development experience and expertise in modern web technologies. Specialized in building scalable web applications, API integrations, and converting Figma designs into pixel-perfect user interfaces. Experienced in full-stack development, teaching, and delivering high-quality solutions across diverse projects and teams.",

  experience: [
    {
      title: "Frontend Developer",
      company: "High Output Ventures",
      location: "Remote",
      period: "Apr 2021 - Apr 2024",
      achievements: [
        "Developed modern web applications using React.js for 3+ years, delivering high-quality user interfaces",
        "Successfully integrated APIs across multiple projects, ensuring seamless data flow and user experience",
        "Converted Figma designs into pixel-perfect, responsive web interfaces with attention to detail",
        "Implemented TypeScript for enhanced code quality and developer experience across projects",
        "Utilized Zustand for efficient state management in complex React applications",
        "Built comprehensive UI component libraries using ChakraUI, TailwindCSS, and styled-components",
        "Established testing practices using Testing Library and Jest for reliable application quality",
        "Managed monorepo projects using Nx for better code organization and build optimization"
      ],
      technologies: ["React.js", "TypeScript", "Next.js", "Zustand", "ChakraUI", "TailwindCSS", "Testing Library", "Jest", "Nx Monorepo"]
    },
    {
      title: "Software Engineer",
      company: "Fsquared Technologies Inc.",
      location: "Philippines",
      period: "Jan 2019 - Jul 2020",
      achievements: [
        "Developed full-stack web applications using modern JavaScript frameworks and backend technologies",
        "Built robust backend APIs using AdonisJS framework with clean architecture principles",
        "Created responsive frontend interfaces using React.js with effective state management",
        "Implemented DevOps practices for streamlined development and deployment processes",
        "Collaborated with cross-functional teams to deliver scalable software solutions",
        "Maintained high code quality standards through code reviews and best practices"
      ],
      technologies: ["React.js", "AdonisJS", "JavaScript", "DevOps", "Full Stack Development"]
    },
    {
      title: "Instructor I",
      company: "University of Southeastern Philippines",
      location: "Davao City, Philippines",
      period: "Sep 2017 - Dec 2018",
      achievements: [
        "Taught Software Engineering courses to undergraduate students in Information Technology",
        "Developed curriculum and learning materials for modern web development technologies",
        "Mentored students in programming concepts, software design patterns, and best practices",
        "Led in-house programming projects, providing hands-on experience with real-world applications",
        "Fostered collaborative learning environment and promoted problem-solving skills",
        "Contributed to academic program improvement and student success initiatives"
      ],
      technologies: ["Software Engineering", "Programming Education", "Project Management", "Curriculum Development"]
    },
    {
      title: "Web Developer",
      company: "SCI Ventures Inc.",
      location: "Philippines",
      period: "Feb 2017 - Jul 2017",
      achievements: [
        "Developed backend systems using AdonisJS framework with MVC architecture",
        "Built interactive frontend applications using React.js and Redux for state management",
        "Implemented RESTful APIs for seamless frontend-backend communication",
        "Collaborated with team members to deliver projects within tight deadlines",
        "Maintained code quality through version control and collaborative development practices"
      ],
      technologies: ["React.js", "Redux", "AdonisJS", "JavaScript", "RESTful APIs"]
    },
    {
      title: "Web Developer",
      company: "@FufuLabs",
      location: "Philippines",
      period: "Aug 2016 - Jan 2017",
      achievements: [
        "Kickstarted professional development career with hands-on web development experience",
        "Learned and implemented backend programming using AdonisJS framework",
        "Developed frontend applications using React.js and Redux for dynamic user interfaces",
        "Gained experience in full-stack development workflows and modern JavaScript ecosystem",
        "Built foundational skills in web application architecture and development practices"
      ],
      technologies: ["React.js", "Redux", "AdonisJS", "JavaScript", "Web Development"]
    }
  ] as Experience[],

  skills: {
    "Frontend Development": [
      "React.js (7 years)", "TypeScript (2+ years)", "Next.js / CRA (2 years)", 
      "JavaScript (ES6+)", "HTML5", "CSS3", "Redux", "Zustand (2+ years)"
    ],
    "UI/UX & Styling": [
      "ChakraUI (2+ years)", "TailwindCSS (2+ years)", "styled-components (2+ years)",
      "Figma to Code Conversion (5 years)", "Responsive Design", "CSS-in-JS", "Material-UI"
    ],
    "Backend & Full Stack": [
      "AdonisJS", "Node.js", "RESTful API Development", "API Integrations (7 years)",
      "Full Stack Development", "MVC Architecture", "DevOps"
    ],
    "Testing & Development Tools": [
      "Testing Library (2 years)", "Jest (2 years)", "Unit Testing", "Integration Testing",
      "Nx Monorepo (2 years)", "Git", "Code Review", "Version Control"
    ],
    "Teaching & Leadership": [
      "Software Engineering Education", "Curriculum Development", "Student Mentoring",
      "Project Management", "Team Collaboration", "Technical Documentation"
    ]
  },

  education: [
    {
      degree: "Bachelor of Science in Information Technology",
      institution: "University of Southeastern Philippines",
      location: "Davao City, Philippines",
      period: "2012 - 2017",
      details: [
        "Specialized in software development and information systems",
        "Relevant coursework: Software Engineering, Web Development, Database Systems, Programming",
        "Gained foundational knowledge in modern development technologies and methodologies"
      ]
    },
    {
      degree: "TESDA Vocational Certificate - Computer Systems Servicing NC II",
      institution: "Jose Maria College of Davao City",
      location: "Davao City, Philippines",
      period: "2016",
      details: [
        "Technical certification in computer systems and hardware servicing",
        "Comprehensive training in computer maintenance and troubleshooting"
      ]
    }
  ] as Education[],

  certifications: [
    "TESDA Computer Systems Servicing NC II (2016)",
    "Frontend Development Specialization - Self-taught and industry experience",
    "React.js Advanced Patterns and Best Practices - Professional experience"
  ],

  projects: [
    {
      name: "Job Digest Bot",
      description: "AI-powered job aggregation platform with career insights and application tracking system",
      technologies: ["React", "TypeScript", "Node.js", "Next.js", "PostgreSQL", "OpenAI API", "Prisma", "TailwindCSS"],
      highlights: [
        "Built comprehensive full-stack application with modern tech stack",
        "Implemented AI-powered job analysis and career insights generation",
        "Created responsive web interface with drag-and-drop kanban functionality",
        "Designed scalable database schema with Prisma ORM for data management"
      ],
      link: "github.com/glvnzn/job-digest-bot"
    },
    {
      name: "High Output Ventures Projects",
      description: "Multiple client projects developed during 3-year tenure as Frontend Developer",
      technologies: ["React.js", "TypeScript", "Next.js", "ChakraUI", "TailwindCSS", "Zustand", "Testing Library"],
      highlights: [
        "Converted Figma designs into pixel-perfect, responsive web applications",
        "Built reusable component libraries following design system principles",
        "Implemented comprehensive testing strategies for reliable code quality",
        "Delivered multiple production-ready applications within project timelines"
      ]
    },
    {
      name: "University Teaching & Curriculum Development",
      description: "Educational projects and curriculum development during academic tenure",
      technologies: ["Software Engineering", "Programming Education", "Project Management", "Web Development"],
      highlights: [
        "Developed comprehensive curriculum for Software Engineering courses",
        "Created hands-on programming projects for student learning",
        "Mentored students in modern web development technologies and best practices",
        "Led in-house development projects bridging academic theory with industry practice"
      ]
    }
  ] as Project[],

  references: [
    {
      name: "Christopher Clint Pacillos",
      title: "Engineering Manager",
      company: "High Output Ventures",
      phone: "+63 995 295 2264",
      email: "christopher@hov.co"
    },
    {
      name: "Mariza Ocoy",
      title: "Business Development Officer",
      phone: "+63 995 140 2392",
      email: "mariza@mugna.tech"
    }
  ]
};

export function Resume() {
  return (
    <div className="min-h-screen bg-white dark:bg-card">
      {/* Resume Content */}
      <div className="w-full">
        <div className="bg-white dark:bg-card print:bg-white">
          {/* Header Section */}
          <div className="bg-primary text-primary-foreground px-8 md:px-16 lg:px-24 xl:px-32 py-12 print:bg-gray-900 print:text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2">{resumeData.personalInfo.name}</h1>
              <p className="text-xl mb-4 opacity-90">{resumeData.personalInfo.title}</p>
              
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{resumeData.personalInfo.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>{resumeData.personalInfo.phone}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{resumeData.personalInfo.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Linkedin className="h-4 w-4" />
                  <span>{resumeData.personalInfo.linkedin}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Github className="h-4 w-4" />
                  <span>{resumeData.personalInfo.github}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span>{resumeData.personalInfo.website}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-12 lg:px-16 xl:px-20 py-6 space-y-6">
            {/* Professional Summary */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Summary
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {resumeData.summary}
              </p>
            </section>

            <Separator />

            {/* Experience */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Professional Experience
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {resumeData.experience.map((exp, index) => (
                  <Card key={index} className="border-l-4 border-l-primary h-fit">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2">
                        <div>
                          <CardTitle className="text-base">{exp.title}</CardTitle>
                          <p className="text-primary font-medium text-sm">{exp.company}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {exp.period}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {exp.location}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 mb-3">
                        {exp.achievements.slice(0, 4).map((achievement, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-xs leading-relaxed">{achievement}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-1">
                        {exp.technologies.map((tech, i) => (
                          <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Skills */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Technical Skills
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Object.entries(resumeData.skills).map(([category, skills]) => (
                  <Card key={category} className="h-fit">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {skills.map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs px-1.5 py-0.5">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Projects */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Github className="h-5 w-5" />
                Featured Projects
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {resumeData.projects.map((project, index) => (
                  <Card key={index} className="h-fit">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm">{project.name}</CardTitle>
                        {project.link && (
                          <Github className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{project.description}</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-0.5 mb-2">
                        {project.highlights.slice(0, 3).map((highlight, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5 flex-shrink-0" />
                            <span className="text-xs leading-tight">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.map((tech, i) => (
                          <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0.5">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Education, Certifications & References */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Education */}
              <section className="xl:col-span-2">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {resumeData.education.map((edu, index) => (
                    <Card key={index} className="h-fit">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs">{edu.degree}</CardTitle>
                        <p className="text-primary font-medium text-xs">{edu.institution}</p>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {edu.period}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {edu.location}
                          </div>
                        </div>
                      </CardHeader>
                      {edu.details && (
                        <CardContent>
                          <ul className="space-y-0.5">
                            {edu.details.slice(0, 2).map((detail, i) => (
                              <li key={i} className="text-xs text-muted-foreground">
                                • {detail}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>

              {/* Certifications */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certifications
                </h2>
                <Card className="h-fit">
                  <CardContent className="pt-4">
                    <ul className="space-y-2">
                      {resumeData.certifications.map((cert, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Award className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-xs leading-tight">{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* References */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  References
                </h2>
                <div className="space-y-3">
                  {resumeData.references.map((ref, index) => (
                    <Card key={index} className="h-fit">
                      <CardContent className="pt-3">
                        <div className="space-y-1">
                          <h4 className="font-medium text-xs">{ref.name}</h4>
                          <p className="text-xs text-primary">{ref.title}</p>
                          {ref.company && (
                            <p className="text-xs text-muted-foreground">{ref.company}</p>
                          )}
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{ref.phone}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{ref.email}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}