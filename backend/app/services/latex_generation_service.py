import re
import os
import subprocess
import tempfile
import shutil

TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "latext-template", "baseline.tex")

def escape_latex(text: str) -> str:
    """Escapes special LaTeX characters in a string."""
    if not isinstance(text, str):
        return ""
    chars = {
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
        '\\': r'\textbackslash{}',
    }
    pattern = re.compile('|'.join(re.escape(k) for k in chars.keys()))
    return pattern.sub(lambda m: chars[m.group(0)], text)

def json_to_latex(resume_json: dict, candidate_name: str = "Candidate Name", email: str = "candidate@email.com") -> str:
    """Converts the resume JSON into LaTeX, importing style rules from baseline.tex."""
    
    preamble = ""
    if os.path.exists(TEMPLATE_PATH):
        try:
            with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
                content = f.read()
                idx = content.find(r"\begin{document}")
                if idx != -1:
                    preamble = content[:idx + len(r"\begin{document}")]
        except Exception:
            pass
            
    if not preamble:
        preamble = r"""\documentclass[10pt,a4paper]{article}
\usepackage[margin=0.5in]{geometry}
\usepackage{hyperref}
\usepackage{array}
\usepackage{enumitem}
\pagestyle{empty}
\newcommand{\sectionheading}[1]{%
    \vspace{6pt}
    {\large\textbf{#1}}
    \vspace{4pt}
    \hrule
    \vspace{4pt}
}
\begin{document}
"""

    latex_code = [preamble, "\n"]
    
    # HEADER
    latex_code.append(rf"""\begin{{center}}
    {{\LARGE\textbf{{{escape_latex(candidate_name)}}}}}\\
    \href{{mailto:{email}}}{{{escape_latex(email)}}}
\end{{center}}
\vspace{{4pt}}
""")

    # SUMMARY
    summary = escape_latex(resume_json.get("summary", ""))
    if summary:
        latex_code.append(r"\sectionheading{PROFESSIONAL SUMMARY}" + "\n")
        latex_code.append(summary + "\n\n")

    # EDUCATION
    education = resume_json.get("education", [])
    if education:
        latex_code.append(r"\sectionheading{EDUCATION}" + "\n")
        for edu in education:
            inst = escape_latex(edu.get("institution", ""))
            deg = escape_latex(edu.get("degree", ""))
            dates = escape_latex(edu.get("dates", ""))
            latex_code.append(rf"\textbf{{{inst}}} \hfill {dates}\\" + "\n")
            latex_code.append(rf"{deg}" + "\n\n")

    # EXPERIENCE
    experience = resume_json.get("experience", [])
    if experience:
        latex_code.append(r"\sectionheading{EXPERIENCE}" + "\n")
        for exp in experience:
            comp = escape_latex(exp.get("company", ""))
            role = escape_latex(exp.get("title", ""))
            dates = escape_latex(exp.get("dates", ""))
            bullets = exp.get("bullets", [])
            
            latex_code.append(rf"\textbf{{{comp}}} \hfill {dates}\\" + "\n")
            latex_code.append(rf"\textit{{{role}}}" + "\n")
            if bullets:
                latex_code.append(r"\begin{itemize}[leftmargin=12pt,itemsep=2pt,topsep=2pt]" + "\n")
                for bullet in bullets:
                    latex_code.append(rf"    \item {escape_latex(bullet)}" + "\n")
                latex_code.append(r"\end{itemize}" + "\n")
            latex_code.append(r"\vspace{4pt}" + "\n")

    # PROJECTS
    projects = resume_json.get("projects", [])
    if projects:
        latex_code.append(r"\sectionheading{PROJECTS}" + "\n")
        for proj in projects:
            title = escape_latex(proj.get("title", ""))
            techs = ", ".join(escape_latex(t) for t in proj.get("technologies", []))
            bullets = proj.get("bullets", [])
            
            latex_code.append(rf"\textbf{{{title}}} \hfill \textit{{{techs}}}\\" + "\n")
            if bullets:
                latex_code.append(r"\begin{itemize}[leftmargin=12pt,itemsep=2pt,topsep=2pt]" + "\n")
                for bullet in bullets:
                    latex_code.append(rf"    \item {escape_latex(bullet)}" + "\n")
                latex_code.append(r"\end{itemize}" + "\n")
            latex_code.append(r"\vspace{4pt}" + "\n")

    # SKILLS
    skills = resume_json.get("skills", [])
    if skills:
        latex_code.append(r"\sectionheading{SKILLS}" + "\n")
        latex_code.append(r"\begin{tabular}{@{}p{3cm}p{13cm}@{}}" + "\n")
        skills_str = ", ".join(escape_latex(s) for s in skills)
        latex_code.append(rf"\textbf{{Technologies}} & {skills_str} \\" + "\n")
        latex_code.append(r"\end{tabular}" + "\n\n")

    # ACHIEVEMENTS
    achievements = resume_json.get("achievements", []) or resume_json.get("Achievements & Certifications", [])
    if achievements:
        latex_code.append(r"\sectionheading{ACHIEVEMENTS}" + "\n")
        for ach in achievements:
            title = escape_latex(ach.get("achievement", ach.get("title", "")))
            desc = escape_latex(ach.get("description", ""))
            date = escape_latex(ach.get("date", ""))
            
            latex_code.append(rf"\textbf{{{title}}} \hfill {date}\\" + "\n")
            if desc:
                latex_code.append(f"{desc}\\\\\n")
            latex_code.append(r"\vspace{4pt}" + "\n")

    latex_code.append(r"\end{document}")
    return "".join(latex_code)

def compile_latex_to_pdf(latex_code: str, output_dir: str = None, filename: str = "resume.pdf"):
    """Compiles LaTeX code to a PDF using pdflatex or tectonic locally.
    If output_dir is provided, saves the file there and returns the path.
    Otherwise returns the PDF bytes.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "resume.tex")
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_code)
            
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        tectonic_path = os.path.join(backend_dir, "tectonic.exe")
        
        pdf_path = os.path.join(tmpdir, "resume.pdf")
        
        if os.path.exists(tectonic_path):
            cmd = [tectonic_path, "resume.tex"]
        elif shutil.which("tectonic"):
            cmd = ["tectonic", "resume.tex"]
        elif shutil.which("pdflatex"):
            cmd = ["pdflatex", "-interaction=nonstopmode", "resume.tex"]
        else:
            raise RuntimeError(
                "No LaTeX compiler (pdflatex or tectonic) found. "
                "Please install a TeX distribution or tectonic, or download the .tex file and compile on Overleaf."
            )
        
        result = subprocess.run(cmd, cwd=tmpdir, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error("LaTeX compilation failed.\nSTDOUT: %s\nSTDERR: %s", result.stdout[-2000:] if result.stdout else "", result.stderr[-2000:] if result.stderr else "")
            
        if os.path.exists(pdf_path):
            if output_dir:
                final_path = os.path.join(output_dir, filename)
                shutil.copy2(pdf_path, final_path)
                return final_path
            else:
                with open(pdf_path, "rb") as f:
                    return f.read()
        else:
            raise RuntimeError(f"PDF generation failed. Compiler output: {(result.stderr or result.stdout or 'no output')[-500:]}")
