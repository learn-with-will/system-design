// Prism core + the languages the System Design lessons use. Architecture diagrams
// and terminal output use the `text` fence, which Prism leaves unhighlighted.
// `bash` covers shell/CLI commands; `json` covers config and API payloads; `yaml`
// covers manifests and config; `sql` covers queries; `http` covers request/response
// snippets.
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-http';
import 'prismjs/themes/prism-tomorrow.css';

export default Prism;
