var graph = { "nodes": [], "links": []};

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
        "radius": 1,
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
          "radius": element.member_id.length,
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

    var width = 960,
    height = 1000;

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

var color = d3.scale.category20();

var force = d3.layout.force()
    .gravity(0.1)
    .charge(-200)
    .linkDistance(150)
    .size([width, height]);

var svg = d3.select(".row").append("svg")
    .attr("width", "100%")
    .attr("height", height);
svg.append("g").append("clipPath")
    .attr("id","circle-path")
  .append("circle")
    .attr("r", 15)

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
    .attr("r", function(d) { return d.radius + 14; })
     .style("fill", function(d) { return color(d.group); });

  gNode.append("image")
    .attr("clip-path", "url(#circle-path)")
    .attr("xlink:href", function(d) { 
      if (d.image) {
        return d.image;
      }
    })
    .attr("x", -15)
    .attr("y", -15)
    .attr("width", 30)
    .attr("height", 30);

  gNode.append("text")
    .attr("text-anchor", "middle")
    .attr("dx", 0)
    .attr("dy", function(d) { 
      if (d.type === "mem") {
        return d.radius*2.0;
      } else if (d.type === "prj") {
        return d.radius*2.0;
      } 
    })
    .text(function(d) { return d.name });

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    gNode.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    // node.attr("cx", function(d) { return d.x; })
    //     .attr("cy", function(d) { return d.y; });
  });
  });
});
// });

