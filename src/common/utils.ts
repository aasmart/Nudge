/**
 * Checks if a node is a document fragment
 * @param node The node to check
 * @returns True if the node is a document fragment
 */
export function isDocumentFragment(node: Node | undefined): node is DocumentFragment {
    return node?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}