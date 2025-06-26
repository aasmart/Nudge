/**
 * Checks if a node is a document fragment
 * @param node The node to check
 * @returns True if the node is a document fragment
 */
export function isDocumentFragment(node: Node | undefined): node is DocumentFragment {
    return node?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

export function countAsString(count: number) {
    switch (count) {
        case 1:
            return `${count}st`;
        case 2:
            return `${count}nd`;
        case 3:
            return `${count}rd`;
        default:
            return `${count}th`;
    }
}
