const blogModel = require('../models/blogmodel')
const authorModel = require('../models/authormodel')
const mongoose = require('mongoose')



//--------------------------------------------POST /blogs---------------------------------------------------



const createNewBlog = async function (req, res) {
    try {
        let blogData = req.body
        //============================================ data not entered ==============================================
        if (!blogData.body) {
            return res.status(400).send({ status: false, msg: "Body is required" })
        }
        /// ============================================== title not entered ========================================
        if (!blogData.title) {
            return res.status(400).send({ status: false, msg: "Title is required" })
        }
        ///=======================================tags not entered =================================================        

        if (!blogData.tags) {
            return res.status(400).send({ status: false, msg: "Tags is required" })
        }
        ///=================================category not entered ==================================================       
        if (!blogData.category) {
            return res.status(400).send({ status: false, msg: "Category is required" })
        }
        //// ============================= authodId not entered ======================================================
        if (!blogData.authorId) {
            return res.status(400).send({ status: false, msg: "AuthorId is required" })
        }
        if (!mongoose.Types.ObjectId.isValid(blogData.authorId)) {
            return res.status(400).send({ status: false, msg: "invalid authorId format" });
        }
        //===================== validating the author if it exist or not =============================================
        let authorId = await authorModel.findById(blogData.authorId)
        if (!authorId) {
            return res.status(404).send({ status: false, msg: "Author doesn't exist" })
        }
        //***************** if author id is not matched with token author id *******************
        if (!(blogData.authorId == req.loggedInAuthorId)) {
            return res.status(403).send({ status: false, msg: "author loggedIn is not allowed to create other author blogs" });
        }

        // ============================== setting date if isPublished is true ================================
        if (blogData.isPublished === true) {
            blogData['publishedAt'] = new Date()
        }

        // ============================ setting date if isDeleted id true =========================================

        if (blogData.isDeleted === true) {
            blogData['deletedAt'] = new Date()
        }

        //========================================  creating blogs ===============================================      
        let blogCreated = await blogModel.create(blogData)
        return res.status(201).send({ status: true, message: "Blog created sucessfully", data: blogCreated })

    }
    catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
    }
}


//------------------------------------------------ GET /blogs ------------------------------------------------------



const getBlogData = async function (req, res) {
    try {
        const queryData = req.query
        //====================================== if data is not entered in queryparams ====================================
        if (Object.keys(queryData).length == 0) {
            const blog = await blogModel.find({ isPublished: true, isDeleted: false })
            if (blog.length == 0) {
                return res.status(404).send({ status: false, msg: "Blog doesn't Exists." })
            }
            return res.status(200).send({ status: true, data: blog })
        }
        //======================================= if data is entered in queryparams ======================================
        if (Object.keys(queryData).length !== 0) {

            let getBlog = await blogModel.find({ $and: [queryData, { isDeleted: false, isPublished: true }] }).populate("authorId")
            if (getBlog.length == 0) {
                return res.status(404).send({ status: false, msg: "No such blog exist.Please provide correct data" })
            }
            return res.status(200).send({ status: true, data: getBlog })
        }
    }
    catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
    }
}


//------------------------------------------PUT /blogs/:blogId ---------------------------------------------------


const updateBlogData = async function (req, res) {
    try {
        const blogId = req.params.blogId;
        const blogUpdatedData = req.body
        //==================================== if data is not entered ==================================
        if (Object.keys(blogUpdatedData).length == 0) {
            return res.status(400).send({ status: false, msg: "Please enter Data to be updated" });
        }

        //====================================== updating data =========================================
        let blog = await blogModel.findOneAndUpdate(
            { _id: blogId, isDeleted: false },
            {
                $set: { isPublished: true, body: blogUpdatedData.body, title: blogUpdatedData.title, publishedAt: new Date() },
                $push: { tags: blogUpdatedData.tags, subcategory: blogUpdatedData.subcategory }
            },
            { new: true });
        //==================== if get null or blog not found or blog is deleted =============================================
        if (!blog) {
            return res.status(404).send({ status: false, msg: "The blog is deleted" })
        }
        return res.status(200).send({ status: true, data: blog });

    }
    catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
    }
}

//------------------------------------------- DELETE /blogs/:blogId --------------------------------------------

const deleteBlogs = async function (req, res) {
    try {
        let blogIdData = req.params.blogId
        let blog = await blogModel.findById(blogIdData)
        // ======================== if the blog is already deleted =======================================
        if (blog.isDeleted === true) {
            return res.status(404).send({ status: false, message: "The blog is already deleted" })
        }
        //=============================== if blog is not deleted and want to delete it ====================
        let deletedBlog = await blogModel.findOneAndUpdate({ _id: blogIdData }, { isDeleted: true, deletedAt: new Date() })
        return res.status(200).send({ status: true, msg: "Data is successfully deleted" })
    }
    catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
    }
}

///-------------------------------------------- DELETE /blogs?queryParams ----------------------------------

const deleteBlogsByQuery = async function (req, res) {
    try {
        const dataQuery = req.query
        const isDeletedFalse = { isDeleted: false, deletedAt: null, isPublished: true }


        let { category, authorId, tags, subcategory } = dataQuery
        if (dataQuery.category) {
            isDeletedFalse['category'] = category
        }
        if (dataQuery.authorId) {
            isDeletedFalse['authorId'] = authorId
        }

        if (dataQuery.tags) {
            isDeletedFalse['tags'] = tags
        }
        if (dataQuery.subcategory) {
            isDeletedFalse['subcategory'] = subcategory
        }

        const dataToDelete = await blogModel.findOne(dataQuery)
        //==========================if data is not found to matching query =======================
        if (!dataToDelete) {
            return res.status(404).send({ status: false, message: "No matching blog found" })
        }
        //===========================if blog is not published=================================
        if (dataToDelete.isPublished === false) {
            return res.status(404).send({ status: false, message: "blog is not yet published" })
        }
        //====================== if found data matching to the query ==========================
        if (dataToDelete) {
            const deletedBlog = await blogModel.find(isDeletedFalse)

            if ((deletedBlog.length === 0)) {
                return res.status(404).send({ status: false, message: "No matching blog found to be deleted" })
            }
            else {
                //============================ updating blog ======================================
                const updateDeletdBlogData = await blogModel.updateMany({ _id: { $in: deletedBlog } }, { $set: { isDeleted: true, deletedAt: new Date() }, new: true })
                return res.status(200).send({ status: true, message: "Blog deleted sucessfully" })
            }

        }
    }
    catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
    }
}

module.exports = { createNewBlog, getBlogData, updateBlogData, deleteBlogs, deleteBlogsByQuery }


