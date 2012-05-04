
# Error 404

exports.not_found = (res) ->
	res.render '404',
		layout: false
		status: 404
# GET home page.

exports.index = (req, res) ->
	res.render 'index', 
		title: 'Chess Problem'