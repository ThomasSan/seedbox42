
var mongoose = require('mongoose');
var ft = require('../utils/ft');
var User = require('../models/User.js');


/**
 * File Schema
 */

var FileSchema = new mongoose.Schema({
	name: String,
	path: { type: String, default: "" },
	size: { type: Number, default: 0 },
	creator: { type: mongoose.Schema.ObjectId, ref: 'User' },
	hashString: { type: String, unique: true },
	isFinished: { type: Boolean, default: false },
	fileType: { type: String, default: '' },
	downloads: { type: Number, default: 0 },
	privacy : { type: Number, default: 1 },
	// torrent: String, //utile ?
	comments: [{
		text: { type: String, default: '' },
		user: { type: mongoose.Schema.ObjectId, ref: 'User' },
		createdAt: { type: Date, default: Date.now }
	}],
	locked: [{
		user: { type: mongoose.Schema.ObjectId, ref: 'User' },
		createdAt: { type: Date, default: Date.now }
	}],
	grades: [{
		user: { type: mongoose.Schema.ObjectId, ref: 'User' },
		grade: Number
	}],
	createdAt : Date,
	torrentAddedAt : { type: Date, default: Date.now }
});


/**
 * Methods statics
 */
FileSchema.statics = {
	getFileById: function (id, cb) {
		this.findOne({ _id: id, isFinished: true })
			.select('-isFinished -path -hashString -torrentAddedAt')
			.exec(function (err, file) {
				if (err)
					return cb(err);
				var retFile = file.toObject();
				User.getByIdFormatShow(file.creator, function (err, fileCreator) {
					if (err)
						return cb(err);
					retFile.creator = fileCreator;
					ft.formatCommentList(file.comments, function (err, formatCom) {
						if (err)
							return cb(err);
						retFile.comments = formatCom;
						return cb(null, retFile);
					});
				});
			});
	},

	getFileList: function (match, sort, limit, user, cb) {
		match.isFinished = true;
		var query = this.find(match);
		query.select('-path -creator -hashString -isFinished -privacy -torrentAddedAt');
		query.sort(sort);
		if (limit > 0)
			query.limit(limit);
		query.exec(function (err, files) {
			if (err)
				return cb(err);
			var formatFiles = ft.formatFileList(files, user);
			return cb(null, formatFiles);
		});
	},

	getCommentsById: function (id, cb) {
		this.findById(id, function (err, file) {
			if (err)
				return cb(err);
			ft.formatCommentList(file.comments, function (err, comments) {
				if (err)
					return cb(err);
				return cb(null, comments);
			});
		});
	},

	getUserLockedFiles: function (user, sortOrder, limit, cb) {
		var query = this.find({ "locked.user": user._id })
				.select('-path -creator -hashString -isFinished -privacy -torrentAddedAt')
				.sort({ "locked.createdAt": sortOrder });
		if (limit > 0)
			query.limit(limit);
		query.exec(function (err, files) {
			if (err)
				return cb(err);
			var formatFiles = ft.formatFileList(files, user);
			return cb(null, formatFiles);
		});
	},

	removeDayLock: function (days, cb) {
		var dateDelete = new Date();
		dateDelete.setDate(dateDelete.getDate() - days);
		this.find({ "locked.createdAt": { $lt: dateDelete } }, function (err, files) {
			files.map(function (file) {
				file.removeAllLock();
			});
		});
	}
};

/**
 * Methods
 */

FileSchema.methods = {
	addComment: function (user, comment, cb) {
		this.comments.push({ text: comment, user: user._id });
		this.save(cb);
	},

	modComment: function (commentId, comment, cb) {
		var index = ft.indexOfByIdKey(this.comments, '_id', commentId);
		if (index > -1)
			this.comments[index].text = comment;
		else
			return cb('comment not found');
		this.save(cb);
	},

	removeComment: function (commentId, cb) {
		var index = ft.indexOfByIdKey(this.comments, '_id', commentId);
		if (index > -1)
			this.comments.splice(index, 1);
		else
			return cb('comment not found');
		this.save(cb);
	},

	countComments: function () {
		return this.comments.length;
	},

	addGrade: function (user, grade, cb) {
		var index = ft.indexOfByIdKey(this.grades, 'user', user._id);
		if (index === -1)
			this.grades.push({ user: user._id, grade: grade });
		else
			return cb('already graded');
		this.save(cb);
	},

	modGrade: function (user, newGrade, cb) {
		var index = ft.indexOfByIdKey(this.grades, 'user', user._id);
		if (index > -1)
			this.grades[index].grade = newGrade;
		else
			return cb('this user have not graded this file yet');
		this.save(cb);
	},

	removeGrade: function (user, cb) {
		var index = ft.indexOfByIdKey(this.grades, 'user', user._id);
		if (index > -1)
			this.grades.splice(index, 1);
		else
			return cb('grade not found');
		this.save(cb);
	},

	getAverageGrade: function () {
		var total = 0;
		if (this.grades.length === 0)
			return (0);
		this.grades.forEach(function (grade) {
			total += grade.grade;
		});
		return (total / this.grades.length);
	},

	addLock: function (user, cb) {
		var index = ft.indexOfByIdKey(this.locked, 'user', user._id);
		if (index === -1)
			this.locked.push({ user: user._id });
		else
			return cb('already locked by this user');
		this.save(cb);
	},

	removeLock: function (user, cb) {
		var index = ft.indexOfByIdKey(this.locked, 'user', user._id);
		if (index > -1 )
			this.locked.splice(index, 1);
		else
			return cb('this file is not locked by this user');
		this.save(cb);
	},

	removeAllLock: function () {
		this.locked = [];
		this.save();
	},

	getIsLocked: function () {
		if (this.locked.length > 0)
			return true;
		return false;
	},

	getIsLockedByUser: function (user) {
		var index = ft.indexOfByIdKey(this.locked, 'user', user._id);
		if (index > -1)
			return true;
		return false;
	},

	incDownloads: function () {
		this.downloads += 1;
		this.save(function (err) {
			if (err)
				console.log("Download increment error: ", err);
		});
	}
};

module.exports = mongoose.model('File', FileSchema);
