var graph = { "nodes": [], "links": []};

var rowWidth = d3.select("#main")[0][0].offsetWidth;

var width = rowWidth || 960;
var height = 1000;

var memberRadius = 10

var color = d3.scale.category20();

var force = d3.layout.force()
    .gravity(0.1)
    .charge(-100)
    .linkDistance(150)
    .size([width, height]);

var svg = d3.select("#main").append("svg")
    .attr("width", width)
    .attr("height", height);
svg.append("g").append("clipPath")
    .attr("id","small-pic-path")
  .append("circle")
    .attr("r", memberRadius);
svg.append("g").append("clipPath")
    .attr("id","large-pic-path")
  .append("circle")
    .attr("r", 3*memberRadius);

var resize = function() {
  width = d3.select("#main")[0][0].offsetWidth;
  svg.attr("width", width);
  force.size([width, height]);
  force.tick();
};

var showDetails = function(d, i){
  var self = d3.select(this);

  self.select("image")
      .attr("clip-path", "url(#large-pic-path)")
      .attr("x", function(d) { return -3*d.radius; })
      .attr("y", function(d) { return -3*d.radius; })
      .attr("width", function(d) { return 6*d.radius; })
      .attr("height", function(d) { return 6*d.radius; });

  self.select("text").classed("hide", false);
};

var hideDetails = function(d, i){
  var self = d3.select(this);

  self.select("image")
      .attr("clip-path", "url(#small-pic-path)")
      .attr("x", function(d) { return -1*d.radius; })
      .attr("y", function(d) { return -1*d.radius; })
      .attr("width", function(d) { return 2*d.radius; })
      .attr("height", function(d) { return 2*d.radius; });
  
  self.select("text").classed("hide", true);
};

d3.select(window).on('resize', resize); 


$.getJSON( "./data/members.json", function (members) {

  members.forEach(function(element, index, array) {
    graph.nodes.push(
      {
        "id": "MEM" + element.id,
        "name": element.name,
        "image": element.image,
        "desc": element.about,
        "skills": element.tags,
        "type": "mem",
        "radius": memberRadius,
        "group": 1
      }
    );
  });

  $.getJSON( "./data/projects.json", function (projects) {
    projects.forEach(function(element, index, array) {
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
      )

      element.member_id.forEach(function(member_id, index, array) {
        graph.links.push(
          {
            "source": "PRJ" + element.id,
            "target": "MEM" + member_id,
            "value":1
          }
        )
      });
    });
    console.log(graph);

    // countExtent = d3.extent(graph.nodes, function(d) { d.num_links; });
    // circleRadius = d3.scale.sqrt().range([3, 12]).domain(countExtent);
 
    // graph.nodes.forEach (n) ->
    //   # set initial x/y to values within the width/height
    //   # of the visualization
    //   n.x = randomnumber=Math.floor(Math.random()*width)
    //   n.y = randomnumber=Math.floor(Math.random()*height)
    //   # add radius to the node so we can use it later
    //   n.radius = circleRadius(n.playcount)
 
    // id's -> node objects
    var nodesMap = (function(nodes) {
      nodesMap = d3.map()
      nodes.forEach(function(n) {
        nodesMap.set(n.id, n);
      });
      return nodesMap;
    })(graph.nodes);
 
    // # switch links to point to node objects instead of id's
    graph.links.forEach(function(l) {
      l.source = nodesMap.get(l.source);
      l.target = nodesMap.get(l.target);
 
      // # linkedByIndex is used for link sorting
      // linkedByIndex["#{l.source.id},#{l.target.id}"] = 1;
    });

    // d3.json("./data/data3.json", function(error, graph) {
    force
        .nodes(graph.nodes)
        .links(graph.links)
        .start();

    var link = svg.selectAll(".link")
        .data(graph.links)
      .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) { return Math.sqrt(d.value); });

    var gNode = svg.selectAll(".node")
        .data(graph.nodes)
      .enter().append("g")
        .attr("class", function(d) { return "node" + d.type; })
        .call(force.drag);

    gNode.append("circle")
      .attr("r", function(d) { return d.radius; })
       .style("fill", function(d) { return color(d.group); });

    gNode.append("image")
      .attr("clip-path", "url(#small-pic-path)")
      .attr("xlink:href", function(d) { 
        if (d.image) {
          return d.image;
        }
      })
      .attr("x", function(d) { return -1*d.radius; })
      .attr("y", function(d) { return -1*d.radius; })
      .attr("width", function(d) { return 2*d.radius; })
      .attr("height", function(d) { return 2*d.radius; });

    gNode.append("text")
      .attr("class", "hide")
      .attr("text-anchor", "middle")
      .attr("dx", 0)
      .attr("dy", function(d) { return 2.5*d.radius; })
      .text(function(d) { return d.name });

    gNode.on("mouseover", showDetails)
      .on("mouseout", hideDetails);

    force.on("tick", function() {
      gNode.attr("cx", function(d) { return d.x = Math.max(15, Math.min(width - 15, d.x)); })
        .attr("cy", function(d) { return d.y = Math.max(15, Math.min(height - 15, d.y)); });
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
      gNode.attr("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; });
    });
  });
});
// });

