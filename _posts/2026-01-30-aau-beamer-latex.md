---
title: AAU Beamer Template (LaTeX)
date: 2026-01-31
lastedit: 2026-01-31
layout: post
hidden: false
tags: [tutorial, latex, aau]
thumb: /images/thumbs/latex.webp
permalink: /:title/
---

# Table of Contents
* Table of Contents
{:toc}

---

# Introduction
This blog post is an introduction and very simple guide for my [AAU LaTeX beamer template](https://github.com/NikoBK/aau-beamer-template){:target="_blank" rel="noopener noreferrer"}. This post is a very similar post to the one I made about my [LaTex report template](https://nikolajbjoernager.dk/aau-report-latex){:target="_blank" rel="noopener noreferrer"} which means it would provide invaluable insight to read before this.

---
# Using the Template
In order for the template to succesfully compile the main document of the project needs to be set to `master/master.tex`. The beamer consist of 'frames' which are slides. The counter in the top right automatically aligns and counts so there is no setup for that. The only work required from you is creating frames themself.

To create a frame make a new file in the `frames` directory and paste the following TeX inside:
```latex
\begin{frame}{Frame Title}{frame description}
    \begin{block}{Text}
      Plain text block on a slide example. Very nice.
    \end{block}
\end{frame}
```

The above code snippet provides the following:
- Frame title: what is seen in the top left of the frame as a title
- Frame description: placed right underneath the title to give some context to the frame
- Text block: this is a block that takes up the center of the frame. Text is simply the name and title of the block, any block on a frame creates a sort of container for text and figures. The block expands and fits any contents defined within it.

The template provides a lot of examples on how to use frames and how to populate them with images.

Once a frame TeX file has been created, go to `master/master.tex` - this is the main document, and add a line `\include{frames/yournewframe.tex}` under a `subsection` or a `section` that fits it. You can freely create your own `section` and `subsection` if required. Figures are made in the same way as the any other LaTeX defined figure.

The template will always add a final frame as long as `\makefinalframe` exists in the main document. Similar to the report template, packages are imported in the `preamble`. Should any of this seem confusing I advice checking out the [AAU LaTeX beamer template post](https://github.com/NikoBK/aau-beamer-template){:target="_blank" rel="noopener noreferrer"} for help.
