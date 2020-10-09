/**
 * When using async/await function in development, recomend using try/catch code block for re-bust. But too much duplicated code in coding. 
 * A webpack async-await-block-prod-loader will helps! 
 * Add try/catch code block for your code as long as there is a async/await function
 */

const parser = require('@babel/parser'); // babel set: loader parse file to AST tree
const traverser = require('@babel/traverse'); // maintains the overall tree state, and is responsible for replacing, removing, and adding nodes
const t = require('@babel/types'); // A Lodash-esque utility library for AST nodes
const core = require('@babel/core'); 
const loaderUtils = require("loader-utils");
const {node} = require('prop-types');

const DEFAULT = {
    cathcCode: identfier => `console.log(${indentifier})`,
    indentifier: 'e',
    finallyCode: null
}

/**
 * @method isAsyncFuncNode
 * @param {String} node - AST node 
 * @returns return true, if it's a async/await code block
 */
const isAsyncFuncNode = node => 
t.isFunctionDeclaration(node, {
    async: true
}) || 
t.isArrowFunctionExpression(node, {
    async: true
}) ||
t.isFunctionExpression(node, {
    async: true
}) ||
t.isObjectMethod(node, {
    async: true
})

module.exports = function (source) {
    let options = loaderUtils.getOptions(this);
    let ast = parser.parse(source, {
        sourceType: 'module',
        plugins: ['dynamicImport']
    });
    options = {
        ...DEFAULT,
        ...options
    };
    if (typeof options.cathcCode === 'function') {
        options.cathcCode = options.cathcCode(options.indentifier) 
    }
    let catchNode = parser.parse(options.catchNode).program.body;
    let finnallyNode = options.finallyCode && parser.parse(options.finallyCode).program.body;
    // Only for the outside async/await
    traverser(ast, {
        AwaitExpression(path) { //https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-babel-traverse
            while (path && path.node) {
                let parentPath = path.parentPath;
                if (t.isBlockStatement(path.node) && isAsyncFuncNode(parentPath.node)) {
                    let tryCatchAs = t.tryStatement(path.node,
                        t.catchClause(
                            t.identifier(options.indentifier),
                            t.blockStatement(catchNode)
                        ),
                        finnallyNode && t.blockStatement(finnallyNode)
                        );
                    path.replaceWithMultiple([tryCatchAs])
                    return
                } else if (t.isBlockStatement(path.node) && t.isTryStatement(path.node)) { // there is try block already 
                    return
                }
                path = parentPath;
            }
        }
    });
    return core.transformFromAstAsync(ast, null, {
        confige: false // block babel.config.js
    }).code
};
