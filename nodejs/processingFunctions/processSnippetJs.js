import lzString from "lz-string";
import {
  checkLongLineWarning,
  missingRequireWarning,
  missingExampleWarning,
  repeatedNameWarning
} from "./warnings.js";
import recursiveProcessPureText from "./recursiveProcessPureText";

const snippetStore = {};

export const setupSnippetsJs = (node) => {
	const snippets = node.getElementsByTagName("SNIPPET");
	for (let i = 0; snippets[i]; i++) {
		const snippet = snippets[i];
		const jsSnippet = snippet.getElementsByTagName("JAVASCRIPT")[0];
		const snippetName = snippet.getElementsByTagName("NAME")[0];
		if (snippetName && jsSnippet) {
      const nameStr = snippetName.firstChild.nodeValue;
      if (snippetStore[nameStr]) {
        repeatedNameWarning(nameStr);
        return
      }
      const codeArr = [];
	    recursiveProcessPureText(jsSnippet.firstChild, codeArr);
	    const codeStr = codeArr.join("").trim();

	    const requirements = snippet.getElementsByTagName("REQUIRES");
	    const requireNames = [];
	    for (let i = 0; requirements[i]; i++) {
	      requireNames.push(requirements[i].firstChild.nodeValue);
	    }

	    snippetStore[nameStr] = { codeStr, requireNames };
    }
	}
}

const sourceAcademyURL = "https://sourceacademy.nus.edu.sg";
// to change to localhost if required
// http://localhost:8075 

const recursiveGetRequires = (name, seen) => {
	if (seen.has(name)) return;
	seen.add(name);
	const snippetEntry = snippetStore[name];
	if (!snippetEntry) {
		missingRequireWarning(name);
		return;
	}
	for (const requirement of snippetEntry.requireNames) {
		recursiveGetRequires(requirement, seen);
	}
}

export const processSnippetJs = (node, writeTo, fileFormat) => {
  if (node.getAttribute("HIDE") == "yes") {
    return;
  }

  const jsSnippet = node.getElementsByTagName("JAVASCRIPT")[0];
  if (jsSnippet) {
    const codeArr = [];
    recursiveProcessPureText(jsSnippet.firstChild, codeArr);
    const codeStr = codeArr.join("").trim();

    let reqStr = '';
    const snippetName = node.getElementsByTagName("NAME")[0];
    if (snippetName) {
      const nameStr = snippetName.firstChild.nodeValue;
      const reqSet = new Set();
      recursiveGetRequires(nameStr, reqSet);
      const reqArr = [];
      for (const reqName of reqSet) {
        const snippetEntry = snippetStore[reqName]; 
        if (snippetEntry && reqName!==nameStr) {
          reqArr.push(snippetEntry.codeStr);
          reqArr.push("\n");
        }
      }
      reqStr = reqArr.join("");
    } else {
      const requirements = node.getElementsByTagName("REQUIRES");
      const reqArr = [];
      for (let i = 0; requirements[i]; i++) {
        const required = requirements[i].firstChild.nodeValue;
        if (snippetStore[required]) {
          reqArr.push(snippetStore[required].codeStr);
          reqArr.push("\n");
        } else {
          missingRequireWarning(required);
        }
      }
      reqStr = reqArr.join("");
    }

    const examples = node.getElementsByTagName("EXAMPLE");
    const exampleArr = [];
    for (let i = 0; examples[i]; i++) {
      const example = examples[i].firstChild.nodeValue;
      if (snippetStore[example]) {
        exampleArr.push("\n\n");
        exampleArr.push(snippetStore[example].codeStr);
      } else {
        missingExampleWarning(example);
      }
    }
    const exampleStr = exampleArr.join("");

    if (fileFormat == "js") {
      writeTo.push(reqStr);
      writeTo.push(codeStr);
      writeTo.push(exampleStr);
      return;
    }
    

  }
};

export default processSnippetJs;
