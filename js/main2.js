var Network = function() {
  //initialize graph constants, variables accessed by all functions
  var main, svg;
  var height = 1000;
  var width = 960; //initialize resize function
  var detailsModal = $('#myModal').modal({"backdrop": false, "show": false});

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
  var layout = "force";
  var force = d3.layout.force()
    .linkDistance(200)
    .gravity(.2)
    .charge(-300)
    .size([width, height]);

  //initialize private functions
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

  var setupData = function(data) {
    countExtent = d3.extent(data.nodes, function(d) { 
      if (d.num_links){
        return d.num_links;
      } 
    });
    circleRadius = d3.scale.sqrt().range([3, 12]).domain(countExtent);
    
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

  var updateNodes = function() {
    node = nodesG.selectAll(".node")
      .data(curNodesData)

    node.enter().append("g")
      .attr("class", "node")
      .call(force.drag);
    
    node.append("circle")
      .attr("r", function(d) { return d.radius + 1; })
      .style("fill", function(d) {
        if (d.type === "prj") {
          return "red";
        } else {
          return "white";
        }
      })
      .style("stroke", "black")
      .style("stroke-width", 2.0)

    node.append("image")
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

    node.append("text")
      .attr("class", "hide")
      .attr("text-anchor", "middle")
      .attr("dx", 0)
      .attr("dy", function(d) { return d.radius + 15; })
      .text(function(d) { return d.name; });
    
    node.on("mouseover", hoverOn)
        .on("mouseout", hoverOff);

    node.on("mouseup", showDetails);
    detailsModal.on("hidden.bs.modal", hideDetails);

    node.exit().remove();
  }

  var updateLinks = function() {
    link = linksG.selectAll(".link")
      .data(curLinksData);
    link.enter().append("line")
      .attr("class", "link")
      .attr("stroke", "#ddd")
      .attr("stroke-opacity", 0.8);

    link.exit().remove();
  }

  var update = function() {
    curNodesData = allData.nodes;
    curLinksData = allData.links;

    force.nodes(curNodesData)
      .links(curLinksData)
      .start();

    updateNodes();
    updateLinks();

    force.on("tick", function() {
        node.attr("cx", function(d) { return d.x = Math.max(35, Math.min(width - 35, d.x)); })
          .attr("cy", function(d) { return d.y = Math.max(35, Math.min(height - 35, d.y)); });
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
    
    self.select("circle")
      .attr("r", function(d) { return mul*d.radius + 1; })

    node.selectAll("circle").style("stroke", function(n) {
        if (neighboring(d, n) || d === n) { 
          return "red";
        } else {
          return "black";
        }
      })
      .style("stroke-width", function(n) {
        if (neighboring(d, n) || d === n) {
          return 4.0;
        } else {
          return 2.0;
        }
      });

    
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
      .attr("height", function(d) { return 2*mul*d.radius; });

    self.select("text")
      .attr("dy", function(d) { return mul*d.radius + 15; });

    self.select("text").classed("hide", false);

    link
      .style("stroke-width", function(l) {
        if (l.source == d || l.target == d) { return 4; } 
        else { return Math.sqrt(l.value); }
      })
      .style("stroke-opacity", function(l) {
        if (l.source == d || l.target == d) { return 1.0; } 
        else { return 0.5; }
      });
  };

  var hoverOff = function(d, i){
    var self = d3.select(this);
    
    self.select("circle")
      .attr("r", function(d) { return d.radius + 1; });

    node.selectAll("circle")
      .style("stroke-width", 2.0)
      .style("stroke", "black");

    
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

    link
      .style("stroke-width", function(l) { return Math.sqrt(l.value); })
      .style("stroke-opacity", function(l) { return 0.5; });
  };

  var showDetails = function(d, i) {
    hideDetails();

    var self = d3.select(this);
    var myModal = d3.select("#myModal");
    var label = myModal.select("#myModalLabel");
    var skills = myModal.select("#skills");
    var projects = myModal.select("#projects");
    var interests = myModal.select("#interests");
    var projArr = [];

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
  };

  var hideDetails = function() {
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

    svg = main.append("svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("g").append("clipPath")
        .attr("id","small-pic-path")
      .append("circle")
        .attr("r", 15);
    
    svg.append("g").append("clipPath")
        .attr("id","large-pic-path")
      .append("circle")
        .attr("r", 30);

    svg.append("g").append("clipPath")
        .attr("id","xl-pic-path")
      .append("circle")
        .attr("r", 60);
    
    linksG = svg.append("g").attr("id", "links");
    nodesG = svg.append("g").attr("id", "nodes");

    update();
  };

  //attach public functions to network object
  network.resize = function() {
    width = main[0][0].offsetWidth;
    svg.attr("width", width);
    force.size([width, height])
    .start();
  };

  //return network object
  return network;
};

var getData = function(location, callback) {
  var type = location.slice(location.lastIndexOf("/")+1, location.lastIndexOf(".")-1);
  return function(data) {
    $.getJSON(location, function(json) {
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
      "radius": 30,
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
          "radius": 15,
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
          "radius": element.member_id.length + 10,
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
          "radius": 30,
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

  myGraph("#main", graph);
  myGraph.resize();
};

var getSponsors = getData("./data/sponsors.json", processData);
var getProjects = getData("./data/projects.json", getSponsors);
var getMembers = getData("./data/members.json", getProjects);

getMembers([]);
