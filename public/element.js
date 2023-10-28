export default class extends HTMLElement {
    constructor(content) {
        super();
        const shadowRoot = this.attachShadow({
            mode: 'open'
        });
        shadowRoot.innerHTML = `
<style>
/* ここにスタイルを記述します */
:host {
  display: block;
  contain: content;
}
p {
  margin: 10px auto;
}
</style>
<!-- ここにHTMLを記述します -->
<div>
  <p>${content}</p>
</div>
`;
    }
}