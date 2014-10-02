function isPost(jsonData) {
    return jsonData.hasOwnProperty('html') && jsonData.hasOwnProperty('markdown') &&
           jsonData.hasOwnProperty('title') && jsonData.hasOwnProperty('slug');
}

function isTag(jsonData) {
    return jsonData.hasOwnProperty('name') && jsonData.hasOwnProperty('slug') &&
        jsonData.hasOwnProperty('description') && jsonData.hasOwnProperty('parent');
}

function isUser(jsonData) {
    return jsonData.hasOwnProperty('bio') && jsonData.hasOwnProperty('website') &&
        jsonData.hasOwnProperty('status') && jsonData.hasOwnProperty('location');
}

module.exports.checks = {
    isPost: isPost,
    isTag: isTag,
    isUser: isUser
};
