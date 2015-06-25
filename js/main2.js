var Network = function() {
	//initialize graph constants, variables accessed by all functions
	var main, svg;
	var width = 960; //initialize resize function

	var width = window.innerWidth < 845 ? window.innerWidth : window.innerWidth*0.8;//960; //initialize resize function
	width = width > 990 ? 990 : width;
	var height = width*(3/4) > 400 ? width*(3/4) : width*(4/3);
	var detailsModal = jQuery('#myModal').modal({"backdrop": true, "show": false});
	var hoverScale = d3.scale.linear().domain([400,1000]).range([4, 3]);
	var radialScale = d3.scale.linear().domain([400,1000]).range([5,10]);
	var gravScale = d3.scale.linear().domain([400,1000]).range([0.4, 0.2]);
	var linkScale = d3.scale.linear().domain([400,1000]).range([3, 7]);
	var chargeScale = d3.scale.linear().domain([400,1000]).range([-2, -1]);
	var height = width*(3/4);

	//data variables
	var allData = [];
	var curLinksData = [];
	var curNodesData = [];
	var linkedByIndex = {};
	var skillsArr = ["web design","social media","public speaking", "mobile app development", "project management", "data analysis", "high fives", "demotivational speaking"];


	var nodesG = null;
	var linksG = null;

	var node = null;
	var link = null;

	//viz variables
	var circleRadius = radialScale(width);
	var linkDistance = circleRadius * linkScale(width);
	var layout = "force";
	var filter = {
		"search": null,
		"type": null,
		"skill": null,
		"selection": null
	};
	var force = d3.layout.force()
		.gravity(.2)
		.size([width, height]);

	// initialize private functions
	var skillsSetup = function() {
		d3.select("#skills-filter").selectAll("option")
			.data(skillsArr).enter()
			.append("option")
			.text(function(d) { return d; });
	}();

	var mapNodes = function(nodes) {
		nodesMap = d3.map();
		nodes.forEach(function(n) {
			nodesMap.set(n.id, n);
		});
		return nodesMap;
	};

	var neighboring = function(a, b) {
		return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id];
	};

	var graphSize = function(data) {
	  width = window.innerWidth < 845 ? window.innerWidth : window.innerWidth*0.8;
	  width = width > 990 ? 990 : width;
	  height = width*(3/4) > 400 ? width*(3/4) : width*(4/3);
	  main.select("svg")
	    .attr("width", width)
	    .attr("height", height);

	  circleRadius = radialScale(width);

	  linkDistance = circleRadius * linkScale(width);
	  force.linkDistance(linkDistance)
	    .charge(chargeScale(width)*linkDistance)
	    .size([width, height]);
	};

	var setupData = function(data) {
		svg = main.append("svg")
		  .attr("width", width)
		  .attr("height", height)
		  .append("g");
		  // .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
		  // .append("g");

		graphSize(data);

		// svg = main.append("svg")
		// 	.attr("width", width)
		// 	.attr("height", height);

		// svg.append("g").append("clipPath")
		// 		.attr("id","small-pic-path")
		// 	.append("circle")
		// 		.attr("r", circleRadius);
		
		// svg.append("g").append("clipPath")
		// 		.attr("id","large-pic-path")
		// 	.append("circle")
		// 		.attr("r", circleRadius * 2);

		// svg.append("g").append("clipPath")
		// 		.attr("id","xl-pic-path")
		// 	.append("circle")
		// 		.attr("r", circleRadius * 4);

		countExtent = d3.extent(data.nodes, function(d) { 
			if (d.num_links){
				return d.num_links;
			}
		});
		// circleRadius = d3.scale.sqrt().range([3, 12]).domain(countExtent);
		
		data.nodes.forEach(function(element) {
		  var scale = Math.sqrt(element.scale/Math.PI);
		  element.radius = scale*circleRadius;
		});

		// id's -> node objects
		var nodesMap = mapNodes(data.nodes);
		
		// switch links to point to node objects instead of id's
		data.links.forEach(function(l, index, array) {
		  if (nodesMap.has(l.source) && nodesMap.has(l.target)){
		    l.source = nodesMap.get(l.source);
		    l.target = nodesMap.get(l.target);

		    // linkedByIndex is used for link sorting
		    linkedByIndex[l.source.id + "," + l.target.id] = 1;
		  } else {
		    array.splice(index, 1);
		  }
		});

		return data;
	};

	var setFilter = function(newFilter) {
		filter[newFilter.type] = newFilter.key;
	};

	var searchFilter = function(nodes, key) {};
	var typeFilter = function(nodes, key) {
		return nodes.filter(function(d, i) {
			return d.type == key;
		});
	};
	var skillsFilter = function(nodes, key) {
		return nodes.filter(function(d, i) {
			return d.skills && d.skills.indexOf(key) > -1;
		});
	}
	var selectionFilter = function(nodes, key) {
		return nodes.filter(function(d, i) {
			return neighboring(d, key) || d == key;
		});
	}

	var filterNodes = function(allNodes) {
		var filteredNodes = allNodes;
		if (filter.search || filter.type || filter.skill || filter.selection) {
			// filteredNodes = filter.search ? searchNodes(filteredNodes) : filteredNodes;
			filteredNodes = filter.type ? typeFilter(filteredNodes, filter.type) : filteredNodes;
			filteredNodes = filter.skill ? skillsFilter(filteredNodes, filter.skill) : filteredNodes;
			filteredNodes = filter.selection ? selectionFilter(filteredNodes, filter.selection) : filteredNodes;
		}
		return filteredNodes;
	};

	var filterLinks = function(allLinks, curNodes) {
		var curNodes = mapNodes(curNodes);
		var filteredLinks = allLinks.filter(function(l) {
			return curNodes.get(l.source.id) && curNodes.get(l.target.id);
		});
		return filteredLinks;
	};

	var updateNodes = function() {
	  node = nodesG.selectAll("g.node")
	    .data(curNodesData, function(d) { return d.id; });

	  var newNodes = node.enter().append("g")
	    .attr("class", "node")
	    .attr("id", function(d) { return d.id; })
	    .call(force.drag);

	  newNodes.append("circle")
	    .attr("r", function(d) { return d.radius + 1; })
	    .attr("class", function(d) { return d.type + " bg"; });

	  newNodes.append("clipPath")
	    .attr("id", function (d) { return d.id + "-clip"})
	    .append("circle")
	    .attr("r", function(d) { return d.radius; })
	    .attr("class", "clip");

	  newNodes.append("image")
	    .attr("clip-path", function(d) {
	      return "url(#" + d.id + "-clip)";
	    })
	    .attr("xlink:href", function(d) {
	      if (d.image) {
	        return d.image;
	      }
	    })
	    .attr("x", function(d) { return -1*d.radius; })
	    .attr("y", function(d) { return -1*d.radius; })
	    .attr("width", function(d) { return 2*d.radius; })
	    .attr("height", function(d) { return 2*d.radius; });

	  newNodes.append("text")
	    .attr("class", "hide")
	    .attr("text-anchor", "middle")
	    .attr("dx", 0)
	    .attr("dy", function(d) { return d.radius + 25; })
	    .text(function(d) { return d.name; });

	  node.on("mouseover", hoverOn)
	      .on("mouseout", hoverOff);

	  node.on("click", function(d, i) {
	    // ignore drag
	    if (d3.event.defaultPrevented) {
	      return;
	    }
	    var self = d3.select(this);
	    showDetails(d, i, self);
	  });

	  detailsModal.on("hide.bs.modal", function() {
	    allData.nodes.forEach(function(d) { d.fixed = false; });
	    force.resume();
	    hideDetails(true);
	  });

	  node.exit().remove();
	};

	var updateLinks = function() {
		link = linksG.selectAll(".link")
			.data(curLinksData, function(d) { return d.source.id + "_" + d.target.id; });
		link.enter().append("line")
			.attr("class", "link")
			.attr("stroke", "black")
			.attr("stroke-opacity", 1.0);

		link.exit().remove();
	}

	var update = function() {
		curNodesData = filterNodes(allData.nodes);
		curLinksData = filterLinks(allData.links, curNodesData);

		curNodesData.forEach(function(element) {
			element.radius = circleRadius;
		})

		force.nodes(curNodesData)
			.links(curLinksData)
			.start();

		updateNodes();
		updateLinks();

		force.on("tick", function() {
				node.attr("cx", function(d) { return d.x = Math.max(circleRadius*2, Math.min(width - circleRadius*2, d.x)); })
					.attr("cy", function(d) { return d.y = Math.max(circleRadius*2, Math.min(height - circleRadius*2, d.y)); });
				link.attr("x1", function(d) { return d.source.x; })
						.attr("y1", function(d) { return d.source.y; })
						.attr("x2", function(d) { return d.target.x; })
						.attr("y2", function(d) { return d.target.y; });
				node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; });
			});
	};

	var hoverOn = function(d, i){
	  var self = d3.select(this);
	  var mul = hoverScale(width)*10;

	  node.sort(function (a, b) { // select the parent and sort the path's
	    if (a.id != d.id) return -1;               // a is not the hovered element, send "a" to the back
	    else return 1;                             // a is the hovered element, bring "a" to the front
	  });

	  var neighbors = selectionFilter(node, d);
	  var non = node.filter(function(n) {
	    return !neighboring(d, n) && n !== d;
	  });
	  var nbLinks = link.filter(function(l) { return l.source == d || l.target == d; });
	  var nonLinks = link.filter(function(l) { return l.source != d && l.target != d; });

	  self.select("circle.clip")
	    .attr("r", function(d) { return mul; });

	  self.select("circle.bg")
	    .attr("r", function(d) { return mul + 2; });

	  self.select("image")
	    .attr("x", function(d) { return -mul; })
	    .attr("y", function(d) { return -mul; })
	    .attr("width", function(d) { return 2*mul; })
	    .attr("height", function(d) { return 2*mul; });

	  self.select("text")
	    .attr("dy", function(d) { return 1.6*mul; });

	  self.select("text").classed("hide", false);

	  neighbors.classed("focus", true);
	  nbLinks.classed("focus", true);
	  non.classed("unfocus", true);
	  nonLinks.classed("unfocus", true);

	};

	var hoverOff = function(d, i){
	  var self = d3.select(this);

	  self.select("circle.clip")
	    .attr("r", function(d) { return d.radius; });

	  self.select("circle.bg")
	    .attr("r", function(d) { return d.radius + 1; });

	  var neighbors = selectionFilter(node, d);
	  var non = node.filter(function(n) {
	    return !neighboring(d, n);
	  });
	  var nbLinks = link.filter(function(l) { return l.source == d || l.target == d; });
	  var nonLinks = link.filter(function(l) { return l.source != d && l.target != d; });

	  neighbors.classed("focus", false);
	  nbLinks.classed("focus", false);
	  non.classed("unfocus", false);
	  nonLinks.classed("unfocus", false);

	  self.select("image")
	    .attr("x", function(d) { return -1*d.radius; })
	    .attr("y", function(d) { return -1*d.radius; })
	    .attr("width", function(d) { return 2*d.radius; })
	    .attr("height", function(d) { return 2*d.radius; });
	  self.select("text")
	    .attr("dy", function(d) { return d.radius + 15; });

	  self.select("text").classed("hide", true);
	};

	var showDetails = function(d, i, self) {

	  network.toggleFilter({type: "selection", key: d});

	  allData.nodes.forEach(function(d) { d.fixed = false; });
	  d.fixed = true;
	  d.px = d.x = width/2;
	  d.py = d.y = height/6;
	  force.resume();

	  hideDetails();

	  var offset = jQuery("#main>svg").offset();
	  window.scroll( 0, offset.top );

	  var myModal = d3.select("#myModal");
	  var label = myModal.select("#myModalLabel");
	  var skills = myModal.select("#skills");
	  var interests = myModal.select("#interests");
	  var links = myModal.select("#links");
	  var linkArr = [];

	  links.select("strong")
	    .text(function() {
	      switch(d.type){
	        case "mem":
	          return "Projects";
	        case "prj":
	          return "Members";
	        default:
	          return "";
	      }
	    });

	  if (d.url) {
	    var link = label.select("a")[0][0] ? label.select("a") : label.append("a");
	    link
	      .attr("href", d.url)
	      .attr("target", "_blank")
	      .text(d.name);
	  } else {
	    label
	      .text(d.name);
	  }

	  if (d.image) {
	    myModal.select("img")
	      .attr("src", d.image);
	    myModal.select("#modal-image").classed("hide", false);
	  } else {
	    myModal.select("img")
	      .attr("src", "/img/avatar.png");
	    myModal.select("#modal-image").classed("hide", false);
	  }

	  myModal.select("#about").select("p")
	    .html(d.desc);

	  if (d.tagline) {
	    myModal.select("#tagline")
	      .select("strong")
	      .html(d.tagline);
	    myModal.select("#tagline")
	      .classed("hide", false);
	  }

	  if (d.skills){
	    if (d.skills.length > 0) {
	      var skill_link = skills.select("ul").selectAll("li")
	        .data(d.skills).enter()
	        .append("li");
	      skill_link
	        .append("span")
	        .text(function(d) {
	          return d;
	        })
	        .classed("badge", true);

	      skills.classed("hide", false);
	    }
	  }

	  if (d.interests){
	    if (d.interests.length > 0) {
	      var interest_link = interests.select("ul").selectAll("li")
	        .data(d.interests).enter()
	        .append("li");
	      interest_link
	        .append("span")
	        .text(function(d) {
	          return d;
	        })
	        .classed("badge", true);

	      interests.classed("hide", false);
	    }
	  }

	  if (d.type != "spn") {
	    allData.nodes.forEach(function(element, index, array) {
	      if (neighboring(d, element)) {
	        linkArr.push(element);
	      }
	    });

	    if (linkArr.length > 0) {
	      links.select("ul").selectAll("li")
	        .data(linkArr).enter()
	        .append("li").append("a")
	        .attr("href", function (d) {
	          return d.url;
	        })
	        .attr("target", "_blank")
	        .text(function(d) { return d.name; });

	      links.classed("hide", false);
	    }
	  }

	  detailsModal.modal('show');
	  // hoverOn(d, i);
	};

	var hideDetails = function(clear) {
	  if (clear){
	    network.toggleFilter({type: "selection", key: null});
	  }

	  var myModal = d3.select("#myModal");
	  var skills = myModal.select("#skills");
	  var interests = myModal.select("#interests");
	  var links = myModal.select("#links");

	  myModal.select("img").attr("src", "");
	  myModal.select("#modal-image").classed("hide", true);

	  myModal.select("#myModalLabel")
	    .text("")
	    .select("a").remove();

	  myModal.select("#about").select("p")
	    .html("");

	  myModal.select("#tagline")
	    .select("strong")
	    .html("");
	  myModal.select("#tagline")
	    .classed("hide", true);

	  skills.select("ul").selectAll("li").remove();
	  skills.classed("hide", true);

	  interests.select("ul").selectAll("li").remove();
	  interests.classed("hide", true);

	  links.select("ul").selectAll("li").remove();
	  links.classed("hide", true);

	};

	
	//initialize graph with selection, data
	var network = function(selection, data) {
		main = d3.select(selection);
		allData = setupData(data);
		
		linksG = svg.append("g").attr("id", "links");
		nodesG = svg.append("g").attr("id", "nodes");

		update();
	};

	network.toggleFilter = function(newFilter) {
		force.stop();
		setFilter(newFilter);
		update();
	};

	//attach public functions to network object
	network.resize = function() {
		force.stop();
		// graphSize("");
		update();
	};

	//return network object
	return network;
};

var getData = function(location, callback) {
	var type = location.slice(location.lastIndexOf("/")+1, location.lastIndexOf(".")-1);
	return function(data) {
		jQuery.getJSON(location, function(json) {
			json.forEach(function(element) {
				element.type = type;
				data.push(element);
			});
			
			if (typeof callback == "function") {
				callback(data);
			}
		});
	};
};

var processData = function(data) {
	var graph = {"nodes": [], "links": []};

	graph.nodes.push(
		{
			"id": "100STATE",
			"image": "img/1.svg",
			"name": "100state",
			"desc": "Est sint aliquip dolor pariatur Lorem ipsum veniam est eiusmod exercitation irure ex culpa ex. Incididunt aute ex tempor mollit commodo eiusmod minim adipisicing consectetur tempor veniam cillum. Adipisicing aliqua pariatur cupidatat enim aute esse culpa consequat dolor proident commodo irure. Exercitation minim laborum et aliquip commodo minim velit eiusmod eu.\r\n",
			"type": "100",
			"radius": 2,
			"group": 0
		}
	);

	data.forEach(function(element, index, array) {
		if (element.type === "member") {
			graph.nodes.push(
				{
					"id": "MEM" + element.id,
					"name": element.name,
					"image": "img/" + element.name.toLowerCase().substring(0,1) + ".svg",
					"desc": element.about,
					"skills": element.skills,
					"interests": element.interests,
					"type": "mem",
					"radius": 1,
					"group": 1
				}
			);
		} else if (element.type == "project") {
			graph.nodes.push(
				{
					"id": "PRJ" + element.id,
					"name": element.company,
					"image": "img/" + element.company.toLowerCase().substring(0,1) + "_light.svg",
					"desc": element.about,
					"url": element.email,
					"num_links": element.member_id.length,
					"type": "prj",
					"radius": 1,
					"group": 2
				}
			);

			if (element.state_prj === true) {
				graph.links.push(
					{
						"source": "PRJ" + element.id,
						"target": "100STATE",
						"value": 1
					}
				);
			}

			element.member_id.forEach(function(id, index, array) {
				graph.links.push(
					{
						"source": "PRJ" + element.id,
						"target": "MEM" + id,
						"value": 1
					}
				);
			});
		}
	});

	var myGraph = Network();

	d3.select(window).on('resize', myGraph.resize);
	
	jQuery("#skills-filter").on("change", function(e) {
		var key = jQuery(this).val() == "" ? null : jQuery(this).val();
		var filter = {
			"type": "skill",
			"key": key
		};
		myGraph.toggleFilter(filter);
	});

	d3.selectAll("#type-filter input").on("click", function(d) {
		var key = d3.select(this).attr("value") == "" ? null : d3.select(this).attr("value");
		var filter = {
			"type": "type",
			"key": key
		};
		myGraph.toggleFilter(filter);
	})

	myGraph("#main", graph);
	myGraph.resize();
};

var getProjects = getData("./data/projects.json", processData);
var getMembers = getData("./data/members.json", getProjects);

getMembers([]);
