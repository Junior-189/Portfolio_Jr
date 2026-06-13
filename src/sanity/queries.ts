/* ─── local groq tagged template (since @sanity/client v7 exports it differently) ─── */
const groq = (strs: TemplateStringsArray, ...vals: string[]) => strs.reduce((a, s, i) => a + s + (vals[i] || ""), "");

export const skillsQuery = groq`
  *[_type == "skill"] | order(order asc) {
    _id, name, years, level, desc
  }
`;

export const projectsQuery = groq`
  *[_type == "project"] | order(order asc) {
    _id, num, title, desc, stack, githubUrl, liveUrl
  }
`;

export const experienceQuery = groq`
  *[_type == "experience"] | order(order asc) {
    _id, year, role, company, desc
  }
`;

export const bioQuery = groq`
  *[_type == "bio"][0] {
    heading, paragraph1, paragraph2,
    stats[]{ value, label }
  }
`;
