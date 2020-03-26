import path from "path";
import {getChildrenByTagName, ancestorHasTag} from './utilityFunctions';
import {
  checkIndexBadEndWarning
} from "./processingFunctions/warnings.js";
import { allFilepath, tableOfContent} from "./index.js";
import { html_links_part1, html_links_part2, beforeContentWrapper } from './htmlContent';
import { recursiveProcessTOC} from './generateTocHtml';

import {
  replaceTagWithSymbol,
  processEpigraphHtml,
  processFigureHtml,
  processExerciseHtml,
  processReferenceHtml,
  processSnippetHtml,
  recursiveProcessPureText,
} from './processingFunctions';

let paragraph_count = 0;
let heading_count = 0;
let footnote_count = 0;
let snippet_count = 0;
let display_footnote_count = 0;
let chapArrIndex = 0;
let chapterTitle = "";
export let chapterIndex = "";
export let toIndexFolder = "";

export const tagsToRemove = new Set([
  "ATTRIBUTION",
  "AUTHOR",
  "#comment",
  "COMMENT",
  "CHANGE",
  "EDIT",
  "EXCLUDE",
  "HISTORY",
  "ORDER",
  "SCHEME",
  "SOLUTION",
  "INDEX",
  "NAME",
  "LABEL"
]);
// SOLUTION tag handled by processSnippet

export const ignoreTags = new Set([
  "CHAPTERCONTENT",
  "NOBR",
  "span",
  "SPLITINLINE",
  "JAVASCRIPT",
  //typos
  "JAVASCIPT",
  "JAVSCRIPT",
  "SPLTINLINE"
]);

export const preserveTags = new Set([
  "B",
  "br",
  "BLOCKQUOTE",
  "EM",
  "QUOTE",
  "SC",
  "SPLIT",
  "UL",
  "LI",
  "OL",
  "SECTIONCONTENT",
  "CITATION",
  "TT",
  "TABLE",
  "table",
  "TR",
  "tr",
  "TD",
  "td",
  "kbd"
]);

export const processTextFunctionsHtml = {

  "#text": (node, writeTo) => {

   // ignore the section/subsection tags at the end of chapter/section files
    if (!node.nodeValue.match(/&(\w|\.|\d)+;/)) {
      writeTo.push(node.nodeValue);
    } 

  },

  ABOUT: (node, writeTo) => {
    writeTo.push(`
      <div class='chapter-title'>
        <div class='permalink'>
        <a name='top' class='permalink'> 
    `);
    writeTo.push(chapterIndex + " " + chapterTitle);
    writeTo.push(`
        </a>
        </div>
      </div>
      <div class='chapter-text'>
        <div class='MATTER'><MATTER>
    `);
    
    if (node.getAttribute("WIP") === "yes") {
         writeTo.push(`<div class="wip-stamp">Note: this section is a work in progress!</div>`)
    }
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    recursiveProcessTextHtml(childNode.nextSibling, writeTo);
    writeTo.push("\n</MATTER></div></div>\n");
  },
  REFERENCES: (node, writeTo) => processTextFunctionsHtml["ABOUT"](node, writeTo),
  WEBPREFACE: (node, writeTo) => processTextFunctionsHtml["ABOUT"](node, writeTo),
  MATTER: (node, writeTo) => processTextFunctionsHtml["ABOUT"](node, writeTo),

  BR: (node, writeTo) => {
    node.nodeName = "br";
    recursiveProcessTextHtml(node, writeTo);
  },

  CHAPTER: (node, writeTo) => {
    writeTo.push(`
      <div class='chapter-title'>
        <div class='permalink'>
        <a name='top' class='permalink'> 
    `);
    writeTo.push(chapterIndex + " " + chapterTitle);
    writeTo.push(`
        </a>
        </div>
      </div>
      <div class='chapter-text'>
        <div class='CHAPTER'><CHAPTER>
    `);

    if (node.getAttribute("WIP") === "yes") {
      writeTo.push(`<div class="wip-stamp">Note: this section is a work in progress!</div>`)
 }
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    recursiveProcessTextHtml(childNode.nextSibling, writeTo);
    writeTo.push("\n</CHAPTER></div></div>\n");
  },

  em: (node, writeTo) => {
    node.nodeName = "EM";
    recursiveProcessTextHtml(node, writeTo);
  },

  EPIGRAPH: (node, writeTo) => {
    processEpigraphHtml(node, writeTo);
  },

  EXERCISE: (node, writeTo) => {
    processExerciseHtml(node, writeTo);
  },

  FIGURE: (node, writeTo) => {
    processFigureHtml(node, writeTo);
  },

  FOOTNOTE: (node, writeTo) => {
    footnote_count += 1;
    writeTo.push("<a class='superscript' id='footnote-link-" + footnote_count + "' href='#footnote-" + footnote_count + "'>[" + footnote_count + "]</a>");
    // clone the current FOOTNOTE node and its children
    let cloneNode = node.cloneNode(true);
    cloneNode.nodeName = "DISPLAYFOOTNOTE";
    let parent = node.parentNode;
    // the last parentNode is <#document> the second last node is either <CHAPTER>/<(SUB)SECTION>
    while (parent.parentNode.parentNode) {
      parent = parent.parentNode;
    }
    // append the cloned node as the last elements inside <CHAPTER>/<SECTION> node
    parent.appendChild(cloneNode); 
  },

  DISPLAYFOOTNOTE: (node, writeTo) => {
    display_footnote_count += 1;
    if (display_footnote_count == 1) {writeTo.push("<hr>");}
    writeTo.push("<div class='footnote'>");
    writeTo.push("\n<a class='footnote-number' id='footnote-" + display_footnote_count + "' href='#footnote-link-" + display_footnote_count + "'>");
    writeTo.push("[" + display_footnote_count + "] </a><FOOTNOTE>");
    recursiveProcessTextHtml(node.firstChild, writeTo);
    writeTo.push("</FOOTNOTE>");
    writeTo.push("</div>");
  },

  H2: (node, writeTo) => {
    node.nodeName = "h2";
    recursiveProcessTextHtml(node, writeTo);
  },

  
  IMAGE: (node, writeTo) => {
    writeTo.push(`<IMAGE src="/${node.getAttribute("src")}"/>`);
  },
  

  LINK: (node, writeTo) => {
    writeTo.push("<a address='" + node.getAttribute("address") + "' href='" + node.getAttribute("address") + "'>");
    recursiveProcessTextHtml(node.firstChild, writeTo);
    writeTo.push("</a>");
  },

  LATEX: (node, writeTo) => processTextFunctionsHtml["LATEXINLINE"](node, writeTo),
  TREETAB: (node, writeTo) => processTextFunctionsHtml["LATEXINLINE"](node, writeTo),
  LATEXINLINE: (node, writeTo) => {
    recursiveProcessPureText(node.firstChild, writeTo);
  },

  MATTERSECTION: (node, writeTo) => {
    heading_count += 1;
    writeTo.push(`
      <div class='permalink'>
        <a name='h${heading_count}' class='permalink'></a><h1>
    `);
    recursiveProcessTextHtml(node.firstChild, writeTo);
    writeTo.push("</h1></div>");
  },

  NAME: (node, writeTo) => {
    recursiveProcessTextHtml(node.firstChild, writeTo);
  },

  P: (node, writeTo) => processTextFunctionsHtml["TEXT"](node, writeTo),
  
  TEXT: (node, writeTo) => {
    paragraph_count += 1;
    writeTo.push("<div class='permalink'>");
    writeTo.push("\n<a name='p" + paragraph_count + "' class='permalink'></a>");
    writeTo.push("<p>");
    recursiveProcessTextHtml(node.firstChild, writeTo);
    writeTo.push("</p>");
    writeTo.push("</div>");
  },

  REF: (node, writeTo) => {
    processReferenceHtml(node, writeTo);
  },

  REFERENCE: (node, writeTo) => {
    // Doesn't do anything special
    writeTo.push("\n");
    recursiveProcessTextHtml(node.firstChild, writeTo);
    writeTo.push("\n");
  },

  SECTION: (node, writeTo) => {
    writeTo.push(`
      <div class='chapter-title'>
        <div class='permalink'>
        <a name='top' class='permalink'> 
    `);
    writeTo.push(chapterIndex + " " + chapterTitle);
    writeTo.push(`
        </a>
        </div>
      </div>
      <div class='chapter-text'>
        <div class='SECTION'><SECTION>
    `);
    
    if (node.getAttribute("WIP") === "yes") {
         writeTo.push(`<div class="wip-stamp">Note: this section is a work in progress!</div>`)
    }
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    recursiveProcessTextHtml(childNode.nextSibling, writeTo);
    writeTo.push("\n</SECTION></div></div>\n");
  },

  SCHEMEINLINE: (node, writeTo) =>
    processTextFunctionsHtml["JAVASCRIPTINLINE"](node, writeTo),

  JAVASCRIPTINLINE: (node, writeTo) => {
    writeTo.push("<kbd>");
    recursiveProcessPureText(node.firstChild, writeTo, { removeNewline: true });
    writeTo.push("</kbd>");
  },

  SNIPPET: (node, writeTo) => {
    if (node.getAttribute("HIDE") == "yes") {
      return;
    } else if (node.getAttribute("LATEX") == "yes") {
      writeTo.push("<kbd class='snippet'>");
      const textit = getChildrenByTagName(node, "JAVASCRIPT")[0];
      if (textit) {
        recursiveProcessPureText(textit.firstChild, writeTo, { removeNewline: true });
      } else {
        recursiveProcessTextHtml(node.firstChild, writeTo);
      }
      writeTo.push("</kbd>");
      return;
    } 
    snippet_count += 1;
    writeTo.push("<div class='snippet' id='javascript_"+chapArrIndex+"_"+snippet_count+"_div'>")
    writeTo.push("<div class='pre-prettyprint'>");
    processSnippetHtml(node, writeTo);
    writeTo.push("</div></div>");
  },

  SPACE: (node, writeTo) => {
    writeTo.push(" ");
    recursiveProcessTextHtml(node.firstChild, writeTo);
  },

  SUBINDEX: (node, writeTo) => {
    // should occur only within INDEX
    // also should only exist after stuff in the main index
    writeTo.push("!");
    const order = getChildrenByTagName(node, "ORDER")[0];
    if (order) {
      recursiveProcessTextHtml(order.firstChild, writeTo);
      writeTo.push("@");
    }
    recursiveProcessTextHtml(node.firstChild, writeTo);
  },

  SUBSECTION: (node, writeTo) => {
    writeTo.push(`
      <div class='chapter-title'>
        <div class='permalink'>
        <a name='top' class='permalink'> 
    `);
    writeTo.push(chapterIndex + " " + chapterTitle);
    writeTo.push(`
        </a>
        </div>
      </div>
      <div class='chapter-text'>
        <div class='SECTION'><SECTION>
    `);
    
    if (node.getAttribute("WIP") === "yes") {
      writeTo.push(`<div class="wip-stamp">Note: this section is a work in progress!</div>`)
    }
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    recursiveProcessTextHtml(childNode.nextSibling, writeTo);
    writeTo.push("\n</SUBSECTION></div></div>\n");
  },

  SUBHEADING: (node, writeTo) => {
    heading_count += 1;
    writeTo.push(`
      <div class='permalink'>
        <a name='h${heading_count}' class='permalink'></a><h1>
    `);
    recursiveProcessTextHtml(node.firstChild, writeTo);
    writeTo.push("</h2></div>");
  },

  SUBSUBSECTION: (node, writeTo) => {
    heading_count += 1;
    writeTo.push(`
      <div class='permalink'>
        <a name='h${heading_count}' class='permalink'></a><h1>
    `);
    recursiveProcessTextHtml(node.firstChild, writeTo);
    writeTo.push("</h1></div>");
  },

  SUBSUBSUBSECTION:(node, writeTo) => {
    writeTo.push("<SUBSUBSUBSECTION>\n");
    const name = getChildrenByTagName(node, "NAME")[0];
    recursiveProcessTextHtml(name.firstChild, writeTo);
    recursiveProcessTextHtml(name.nextSibling, writeTo);
    writeTo.push("\n</SUBSUBSUBSECTION>\n");
  }
};

export const processTextHtml = (node, writeTo) => {
  const name = node.nodeName;
  if (processTextFunctionsHtml[name]) {
    processTextFunctionsHtml[name](node, writeTo);
    return true;
  } else {
    if (replaceTagWithSymbol(node, writeTo) || tagsToRemove.has(name)) {
      return true;
    } else if (ignoreTags.has(name)) {
      recursiveProcessTextHtml(node.firstChild, writeTo);
      return true;
    } else if (preserveTags.has(name)){
      writeTo.push("<"+ name + ">");
      recursiveProcessTextHtml(node.firstChild, writeTo);
      writeTo.push("</"+ name + ">");
      return true;
    }
  }
  console.log("WARNING Unrecognised Tag:\n" + node.toString() + "\n");
  return false;
};

export const recursiveProcessTextHtml = (node, writeTo) => {
  if (!node) return;
  processTextHtml(node, writeTo);
  return recursiveProcessTextHtml(node.nextSibling, writeTo);
};

const beforeContent = (writeTo) => {
  writeTo.push(html_links_part1);
  writeTo.push(`
  <meta name="description" content="${chapterIndex + " " + chapterTitle}" />
    <title>
      ${chapterIndex + " " + chapterTitle}
    </title>
    `);
  html_links_part2(writeTo, toIndexFolder);
  recursiveProcessTOC(0, writeTo, "sidebar", toIndexFolder);
  writeTo.push("</div>\n"); 
  writeTo.push(beforeContentWrapper);
}

const afterContent = (writeTo) => {

  writeTo.push(`
    <div class='nav'>
  `);

  if (chapArrIndex > 1) {
    writeTo.push(`
      <button type='button' class='btn btn-secondary' style='background-color: #fff;'>
        <a href='${toIndexFolder}${allFilepath[chapArrIndex - 1]}'>&lt; Previous</a>
      </button>
    `);
  }
  writeTo.push(`
    <div style='flex-grow: 1;'></div>
  `);
  
  if (chapArrIndex < allFilepath.length) {
    writeTo.push(`
      <button type='button' class='btn btn-secondary' style='background-color: #fff;'>
        <a class='scroll-next' href='${toIndexFolder}${allFilepath[chapArrIndex + 1]}'>Next &gt;</a>
      </button>
      `);
  }
  writeTo.push(`</div>
    <div class='chapter_sign'>
      ${chapterIndex + " " + chapterTitle}
    </div>
    <div class='next-page'></div>
    </div>
    </div> <!-- /.container -->
    </body></html>`);
}

export const parseXmlHtml = (doc, writeTo, filename) => {
  
  //console.log(allFilepath);
  chapterIndex = tableOfContent[filename].index;
  chapterTitle = tableOfContent[filename].title;
  toIndexFolder = tableOfContent[filename].relativePathToMain;
  //console.log(chapterIndex + " " + chapterTitle);
  paragraph_count = 0;
  footnote_count = 0;
  display_footnote_count = 0;
  heading_count = 0;
  snippet_count = 0;
  chapArrIndex = allFilepath.indexOf(filename);
  console.log(chapArrIndex + " " + filename + "\n");

  beforeContent(writeTo);
  recursiveProcessTextHtml(doc.documentElement, writeTo);
  afterContent(writeTo);
}

/*
const permalink_wrap = (node, name) => {
  const permalink = doc.createElement('QUOTE');
  permalink.setAttribute('name', name);
  permalink.setAttribute('class', 'permalink');
  const wrapper_div = doc.createElement('QUOTE');
  wrapper_div.setAttribute('class', 'permalink');
  node.appendChild(wrapper_div).appendChild(permalink)
};
*/



