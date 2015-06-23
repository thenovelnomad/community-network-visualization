var Network = function() {
  //initialize graph constants, variables accessed by all functions
  var main, svg;
  var width = 960; //initialize resize function
  var height = width*(3/4);
  var detailsModal = jQuery('#myModal').modal({"backdrop": true, "show": false});

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
  var circleRadius = 10;
  var linkDistance = circleRadius * 10;
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
    circleRadius = (width/2)/Math.sqrt(10.0*data.nodes.length/Math.PI);
    linkDistance = circleRadius * 8;
    force.linkDistance(linkDistance)
      .charge(-2*linkDistance);
  }

  var setupData = function(data) {
    graphSize(data);

    svg = main.append("svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("g").append("clipPath")
        .attr("id","small-pic-path")
      .append("circle")
        .attr("r", circleRadius);
    
    svg.append("g").append("clipPath")
        .attr("id","large-pic-path")
      .append("circle")
        .attr("r", circleRadius * 2);

    svg.append("g").append("clipPath")
        .attr("id","xl-pic-path")
      .append("circle")
        .attr("r", circleRadius * 4);

    countExtent = d3.extent(data.nodes, function(d) { 
      if (d.num_links){
        return d.num_links;
      } 
    });
    // circleRadius = d3.scale.sqrt().range([3, 12]).domain(countExtent);
    
    // id's -> node objects
    var nodesMap = mapNodes(data.nodes);
    
    // switch links to point to node objects instead of id's
    data.links.forEach(function(l) {
      l.source = nodesMap.get(l.source);
      l.target = nodesMap.get(l.target);
    
      // linkedByIndex is used for link sorting
      linkedByIndex[l.source.id + "," + l.target.id] = 1;
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
      .call(force.drag);
    
    newNodes.append("circle")
      .attr("r", function(d) { return d.radius + 1; })
      .attr("class", function(d) { return d.type; });

    newNodes.append("image")
      .attr("clip-path", function(d) {
        if (d.type === "mem") {
          return "url(#small-pic-path)";
        } else if (d.type === "spn") {
          return "url(#large-pic-path)";
        }
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

    node.on("mouseup", showDetails);
    detailsModal.on("hidden.bs.modal", hideDetails);

    node.exit().remove();
  }

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
    var mul = 2;

    var neighbors = selectionFilter(node, d);
    var non = node.filter(function(n) {
      return !neighboring(d, n) && n !== d;
    });
    var nbLinks = link.filter(function(l) { return l.source == d || l.target == d; });
    var nonLinks = link.filter(function(l) { return l.source != d && l.target != d; });

    self.select("circle")
      .attr("r", function(d) { return mul*d.radius + 2; });

    self.select("image")
      .attr("clip-path", function(d) {
        if (d.type === "mem") {
          return "url(#large-pic-path)";
        } else if (d.type !== "prj") {
          return "url(#xl-pic-path)";
        }
      })
      .attr("x", function(d) { return -mul*d.radius; })
      .attr("y", function(d) { return -mul*d.radius; })
      .attr("width", function(d) { return 2*mul*d.radius; })
      .attr("height", function(d) { return 2*mul*d.radius; })

    self.select("text")
      .attr("dy", function(d) { return mul*d.radius + 15; });

    self.select("text").classed("hide", false);

    neighbors.classed("focus", true);
    nbLinks.classed("focus", true);
    non.classed("unfocus", true);
    nonLinks.classed("unfocus", true);
  
  };

  var hoverOff = function(d, i){
    var self = d3.select(this);
    
    self.select("circle")
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

    // node.selectAll("circle")
    //   .style("stroke-width", 2.0)
    //   .style("opacity", 1.0)
    //   .style("stroke", "black");

    
    self.select("image")
      .attr("clip-path", function(d) {
        if (d.type === "mem") {
          return "url(#small-pic-path)";
        } else if (d.type !== "prj") {
          return "url(#large-pic-path)";
        }
      })
      .attr("x", function(d) { return -1*d.radius; })
      .attr("y", function(d) { return -1*d.radius; })
      .attr("width", function(d) { return 2*d.radius; })
      .attr("height", function(d) { return 2*d.radius; });
    self.select("text")
      .attr("dy", function(d) { return d.radius + 15; });
    
    self.select("text").classed("hide", true);

    // link
    //   .style("stroke-width", function(l) { return Math.sqrt(l.value); })
    //   .style("stroke-opacity", function(l) { return 0.5; });
  };

  var showDetails = function(d, i) {
    // network.toggleFilter({type: "selection", key: d});

    hideDetails();

    var self = d3.select(this);
    var myModal = d3.select("#myModal");
    var label = myModal.select("#myModalLabel");
    var skills = myModal.select("#skills");
    var projects = myModal.select("#projects");
    var interests = myModal.select("#interests");
    var projArr = [];

    self.attr("x", width/2);
    self.attr("y", height/2);

    if (d.url) {
      var link = label.select("a")[0][0] ? label.select("a") : label.append("a");
      link
        .attr("src", d.url)
        .text(d.name);
    } else {
      myModal.select("#myModalLabel")
        .text(d.name);
    }

    if (d.image) {
      myModal.select("img")
        .attr("src", d.image)
        .classed("round", d.type == "mem");
      myModal.select("#modal-image").classed("hide", false);
      myModal.select("#modal-info").classed("col-md-9", true);
    } 

    myModal.select("#about").select("p")
      .text(d.desc);

    if (d.type == "mem"){
      if (d.interests.length > 0) {
        interests.select("ul").selectAll("li")
          .data(d.interests).enter()
          .append("li")
          .classed("pull-left", true)
          .text(function(d) { return d; });
      
        interests.classed("hide", false);
      }
      
      if (d.skills.length > 0) {
        skills.select("ul").selectAll("li")
          .data(d.skills).enter()
          .append("li")
          .classed("pull-left", true)
          .text(function(d) { return d; });
  
        skills.classed("hide", false);
      }

      allData.nodes.forEach(function(element, index, array) {
        if (neighboring(d, element)) {
          projArr.push(element.name);
        }
      });

      if (projArr.length > 0) {
        projects.select("ul").selectAll("li")
          .data(projArr).enter()
          .append("li")
          .classed("pull-left", true)
          .text(function(d) { return d; });

        projects.classed("hide", false);
      }
    }

    detailsModal.modal('show');

    hoverOn(d, i);
  };

  var hideDetails = function(clear) {
    if (clear){
      network.toggleFilter({type: "selection", key: null});
    }

    var myModal = d3.select("#myModal");
    var interests = myModal.select("#interests");
    var skills = myModal.select("#skills");
    var projects = myModal.select("#projects");

    myModal.select("img").attr("src", "");
    myModal.select("#modal-image").classed("hide", true);
    myModal.select("#modal-info").classed("col-md-9", false);

    myModal.select("#myModalLabel")
      .text("")
      .select("a").remove();

    interests.select("ul").selectAll("li").remove();
    interests.classed("hide", true);
    skills.select("ul").selectAll("li").remove();
    skills.classed("hide", true);
    projects.select("ul").selectAll("li").remove();
    projects.classed("hide", true);

  }

  
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
      "image": "http://100state.com/wp-content/themes/100state/img/red-logo.svg",
      "name": "100 State",
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
          "image": element.image,
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
          "image": element.image,
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
    } else if (element.type == "sponsor"){
      graph.nodes.push(
        {
          "id": "SPN" + element.id,
          "name": element.company,
          "image": element.picture,
          "desc": element.about,
          "url": element.url,
          "type": "spn",
          "radius": 2,
          "group": 3
        }
      );
      graph.links.push(
        {
          "source": "SPN" + element.id,
          "target": "100STATE",
          "value":1
        }
      );
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

var getSponsors = getData("./data/sponsors.json", processData);
var getProjects = getData("./data/projects.json", getSponsors);
var getMembers = getData("./data/members.json", getProjects);

getMembers([]);
