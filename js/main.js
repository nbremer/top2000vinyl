// TODO: Add data for hover highlight same band (based on November code) -> use hidden canvas to figure out where the hover is + voronoi? and draw the stroked circles and lines on svg
// TODO: Add "who's hovered" (artist + song name) in center
// TODO: Annotate the top 10 songs?

// Finalize
// TODO: Turn all English words into Dutch version
// TODO: Fill in header meta data + create image for sharing

    var container = d3.select("#chart")

    var pi2 = 2*Math.PI,
        pi = Math.PI,
        pi1_2 = Math.PI/2;

    ////////////////////////////////////////////////////////////// 
    ///////////////////////// Set up sizes ///////////////////////
    ////////////////////////////////////////////////////////////// 

    var base_width = 1400,
        base_height = 1400

    var width = base_width;
    var height = base_height;

    //How much smaller is this visual than the original
    var size_factor = _.round(width/base_width,3);

    ////////////////////////////////////////////////////////////// 
    //////////////////////// Create SVG //////////////////////////
    ////////////////////////////////////////////////////////////// 

    container.style("height", height + "px");

    //Canvas
    var canvas = container.append("canvas")
        .attr("id", "canvas-vinyl")
    var ctx = canvas.node().getContext("2d");
    crispyCanvas(canvas, ctx, 2);
    ctx.translate(width/2,height/2);

    //SVG container
    var svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)

    var chart = svg.append("g")
        .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")")

    //////////////////////////////////////////////////////////////
    //////////////// Initialize helpers and scales ///////////////
    //////////////////////////////////////////////////////////////

    var num_songs = 2000,
        start_year = 1954,
        end_year = 2016;

    var outer_radius = width * 0.45,
        inner_radius = outer_radius * 2.2/7;

    var step_size = 5.5;
    var color_red = "#CB272E"
    var axis = d3.range(0,80,10)

    //The angle of each year
    var angle = d3.scaleLinear()
        .domain([start_year, end_year])
        .range([0.07 * pi2, 1.05 * pi2])

    //Radius of the songs
	var radius_scale = d3.scaleSqrt()
        .domain([1,10,25,50,100,250,500,1000,2000])
        .range([40,28,22,16,12,8,5,3,2]);

    //The bigger the circle, the lower the opacity
    var opacity_scale = d3.scaleLinear()
        .domain([1,50,250,1000])
        .range([0.2,0.3,0.4,0.5])
        .clamp(true);

    //What language to show
    var lang = getQueryVariable("lang"); //nl or en
    if(lang === "nl") {
        d3.select(".credit.nl").style("display","flex");
        d3.select(".sub-title.nl").style("display","inline");
        d3.selectAll(".credit.en, .sub-title.en").style("display","none");
    }//if

    //////////////////////////////////////////////////////////////
    ////////////////// Draw the vinyl in canvas //////////////////
    //////////////////////////////////////////////////////////////

    //Draw the big circle
    ctx.fillStyle = "rgb(30,30,30)";
    ctx.beginPath();
    ctx.arc(0, 0, outer_radius, 0, pi2, false);
    ctx.closePath();
    ctx.fill();
   
    //Based on https://codepen.io/pupismyname/pen/WvQEJR
    function create_vinyl_gradient(rotate,degrees,grey1,grey2) {
        var pieces = 120,
            size = degrees / pieces,
            min = 0 - degrees / 2; // low side of the arc

        ctx.globalCompositeOperation = "source-atop";
        for (var i = 0; i < pieces; i++) {
            var deg = i * size + rotate;
            var grey = parseInt((grey2 - grey1) * i / (pieces - 1) + grey1, 10);
            ctx.fillStyle = "rgb(" + grey + ", " + grey + ", " + grey + ")";
            ctx.strokeStyle = ctx.fillStyle;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            var x1 = (outer_radius * 10) * Math.cos(deg * pi / 180);
            var y1 = (outer_radius * 10) * Math.sin(deg * pi / 180);
            var x2 = (outer_radius * 10) * Math.cos((deg + size) * pi / 180);
            var y2 = (outer_radius * 10) * Math.sin((deg + size) * pi / 180);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke(); // stroke covers up tiny gaps between slices caused by anti aliasing
        }//for i
    }//function create_vinyl_gradient

    var color_base = 30,
        color_highlight = 120,
        color_top_highlight = 220;

    var grad_start = -85,
        grad_length = 12,
        grey_length = 25;
    var grad_hl_start = -42,
        grad_hl_length = 1,
        highlight_length = 1;

    function draw_highlight(grad_start, grad_length, grey_length, color_base, color_highlight) {
        create_vinyl_gradient(grad_start,grad_length,color_base,color_highlight)
        create_vinyl_gradient(grad_start+grad_length,grey_length,color_highlight,color_highlight)
        create_vinyl_gradient(grad_start+grad_length+grey_length,grad_length,color_highlight,color_base)
    }//function draw_highlight

    //Top right gradients
    draw_highlight(grad_start, grad_length, grey_length, color_base, color_highlight)
    //draw_highlight(grad_hl_start, grad_hl_length, highlight_length, color_highlight, color_top_highlight)

    //Bottom left gradients
    ctx.rotate(Math.PI);
    draw_highlight(grad_start, grad_length, grey_length, color_base, color_highlight)
    //draw_highlight(grad_hl_start, grad_hl_length, highlight_length, color_highlight, color_top_highlight)
    ctx.rotate(-Math.PI);

    //Outer blank ring
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, outer_radius*1.01, 0, pi2, false);
    ctx.closePath();
    ctx.lineWidth = outer_radius*0.02;
    ctx.stroke();

    //Inner blank ring + red ring
    ctx.fillStyle = color_red;
    ctx.beginPath();
    ctx.arc(0, 0, inner_radius*0.93, 0, pi2, false);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = outer_radius*0.02;
    ctx.stroke();

    //Create track (axis) rings
    ctx.strokeStyle = "black";
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    for(var i = 0; i < axis.length; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, inner_radius + step_size * axis[i], 0, pi2, false);
        ctx.closePath();

        ctx.stroke();
    }//for i
    ctx.globalAlpha = 1;

    //Top white center circle
    chart.append("circle")
        .attr("r", width * 0.005)
        .style("fill", "white")

    //////////////////////////////////////////////////////////////
    ////////////////// Create number count axis //////////////////
    //////////////////////////////////////////////////////////////

    //Add count axis text on top
    var axis_count_group = chart.append("g").attr("class", "axis-count-group");
    //Create paths for the axis
    axis_count_group.selectAll("axis-path")
        .data(axis)
        .enter().append("path")
        .attr("class", ".axis-path")
        .attr("id", function(d) { return "axis-path-" + d; })
        .style("display","none")
        .attr("d", function(d) {
            var rad = inner_radius + step_size * d; //radius
            return "M" + 0 + "," + -rad + " A" + rad + "," + rad + " 0 1 1 " + -0.01 + "," + -rad;
        });
    //Add text to axis paths
    axis_count_group.selectAll(".axis-label")
        .data(axis.filter(function(d,i) { return i !== 0; }))
        .enter().append("text")
        .attr("class", "axis-label")
        .attr("dy", "-0.4em")
        .style("font-size", 13 + "px")
        .append("textPath")
        .attr("xlink:href", function(d) { return "#axis-path-" + d; })
        .attr("startOffset", "8%")
        .text(function(d,i) { return i === axis.length-2 ? lang === "nl" ? "Aantal liedjes" : "Number of songs" : d; });

    //////////////////////////////////////////////////////////////
    //////////////////// Add release year axis ///////////////////
    //////////////////////////////////////////////////////////////

    //Add year axis around the edges
    var year_axis = d3.range(1960,2020,5)
    var axis_year_group = chart.append("g").attr("class", "axis-year-group");
    //Add the year labels
    axis_year_group.selectAll(".axis-year-label")
        .data(year_axis)
        .enter().append("text")
        .attr("class", "axis-year-label")
        .attr("transform", function(d) { 
            var a = angle(d) * 180/pi - 180;
            return "rotate(" + a + ")translate(0," + (outer_radius * 0.97) + ")rotate(" + ((a > 90 && a < 270) || (a < -90) ? "180" : "0") + ")"; 
        })
        .attr("dy", "0.35em")
        .style("font-size", 14 + "px")
        .text(function(d) { return d; });

    //Create path for the axis explanation
    axis_year_group.append("path")
        .attr("class", "axis-year-path")
        .attr("id", "axis-year-path")
        .style("display","none")
        .attr("d", function(d) {
            var rad = outer_radius * 1.045;
            return "M" + 0 + "," + rad + " A" + rad + "," + rad + " 0 1 1 " + 0.01 + "," + rad;
        });
    //Add title to the path
    axis_year_group.append("text")
        .attr("class", "axis-year-title")
        .attr("dy", "0.35em")
        .style("font-size", 18 + "px")
        .append("textPath")
        .attr("xlink:href", "#axis-year-path")
        .attr("startOffset", "38%")
        .html(lang === "nl" ? "Jaar waarin het liedje is uitgekomen &#8594;" : "The release year of a song &#8594;");

    //////////////////////////////////////////////////////////////
    /////////////////// Add title in the center //////////////////
    //////////////////////////////////////////////////////////////

    var center_title_group = chart.append("g").attr("class", "center-title-group");
    //Create path for the text that goes around center
    center_title_group.append("path")
        .attr("class", "center-circle-path")
        .attr("id", "center-circle-path")
        .style("display","none")
        .attr("d", function(d) {
            var rad = inner_radius * 0.82;
            return "M" + -rad + "," + 0 + " A" + rad + "," + rad + " 0 1 1 " + -rad + "," + 0.01;
        });
    //Add title to the path
    center_title_group.append("text")
        .attr("class", "center-text-around")
        .attr("dy", "0.35em")
        .style("font-size", 12 + "px")
        .append("textPath")
        .attr("xlink:href", "#center-circle-path")
        .attr("startOffset", "0%")
        .text("A visualization of all 2000 songs from NPO Radio 2's Top 2000. Each song is placed according to its release year. The Top 2000 has been on Dutch Radio between Christmas & New Year's since 1999");

    //Add TOP 2000 text
    center_title_group.append("text")
        .attr("class", "center-title")
        .attr("dy", "0.35em")
        .attr("y", -inner_radius * 0.27)
        .style("font-size", 55 + "px")
        .text("TOP 2000");

    ///////////////////////////////////////////////////////////////////////////
    //////////////////////////// Add size legend //////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    var size_legend_group = chart.append("g")
        .attr("class", "size-legend-group")
        .attr("transform", "translate(" + (-width/2 + 50) + "," + (height/2 - 80) + ")");

    size_legend_group.append("text")
        .attr("class", "size-legend-title")
        .attr("x", -35)
        .attr("y", -50)
        .text(lang === "nl" ? "Positie in de Top 2000" : "Position in Top 2000");

    //Add circles
    // var size_distance = [13, 86, 141, 184, 218, 246, 271, 296, 321];
    var size_distance = [0, 45, 80, 110, 140, 170, 200, 230, 260];
    size_legend_group.selectAll(".size-legend-circle")
        .data(radius_scale.range())
        .enter().append("circle")
        .attr("class", "size-legend-circle")
        .attr("cx", function (d, i) { return size_distance[i]; })
        .attr("r", function (d) { return d; })
        .style("stroke", function(d,i) { return i <= 1 ? color_red : null; })

    //Add numbers below
    var size_font = [14, 14, 13, 12];
    size_legend_group.selectAll(".size-legend-label")
        .data(radius_scale.domain())
        .enter().append("text")
        .attr("class", "size-legend-label")
        .attr("x", function (d, i) { return size_distance[i]; })
        .attr("y", 65)
        .attr("dy", "0.35em")
        .style("font-size", function (d, i) { return i <= 3 ? size_font[i] + "px" : "11px"; })
        .text(function (d) { return d; })

    //////////////////////////////////////////////////////////////
    /////////////////////// Read in the data /////////////////////
    //////////////////////////////////////////////////////////////

d3.csv("data/top2000_2016.csv", function (error, data) {
    if (error) throw error;

    //////////////////////////////////////////////////////////////
    /////////////////////// Final data prep //////////////////////
    //////////////////////////////////////////////////////////////

    data.forEach(function (d,i) {
        d.rank = +d.rank;
        d.releaseYear = +d.releaseYear;
    })//forEach

    //Sort from lowest to highest song
    data.sort(function(a,b) { return b.rank - a.rank; });

    // //Sort alphabetically
    // data.sort(function(a, b){
    //     if(a.artist < b.artist) return -1;
    //     if(a.artist > b.artist) return 1;
    //     return 0;
    // })

    // //////////////////////////////////////////////////////////////
    // ////////////////// Create a group per year ///////////////////
    // //////////////////////////////////////////////////////////////

    // //Outer group that will wrap around all the year groups within
    // var chart_group = chart.append("g")
    //     .attr("class","chart-group")
    //     .style("isolation","isolate")

    // //The group that will contain all the circles of one release year
    // var year_group = chart_group.selectAll(".year-group")
    //     .data(d3.range(start_year,end_year+1))
    //     .enter().append("g")
    //     .attr("id", function(d) { return "year-group-" + d; })
    //     .attr("class", "year-group")
    //     .attr("transform", function(d) { return "rotate(" + (angle(d) * 180/Math.PI - 180) + ")"; })

    //////////////////////////////////////////////////////////////
    //////////// Create the insides of each year group ///////////
    //////////////////////////////////////////////////////////////

    ctx.fillStyle = "white";
    //Loop over each year and draw the year circles
    for(var i = start_year; i <= end_year; i++) {

        var data_year = data.filter(function(s) { return s.releaseYear === i; });
        var max_height = 0;
        var a = angle(i);

        //Draw each song
        data_year.forEach(function(s,j) {
            //Keep check of the maximum height for the axis line, if needed
            if(_.indexOf(year_axis, i) >= 0) max_height = inner_radius + step_size * j + radius_scale(s.rank);
    
            var rad = inner_radius + step_size * j;
            var x = rad * Math.cos(a - pi1_2);
            var y = rad * Math.sin(a - pi1_2);


            //Draw the bigger - rank based circles
            ctx.globalAlpha = opacity_scale(s.rank);
            ctx.beginPath();
            ctx.arc(x, y, radius_scale(s.rank), 0, pi2, false);
            ctx.closePath();
            ctx.fill();
            //Stroke the top 10 red
            if(s.rank <= 10) {
                ctx.globalAlpha = 0.7;
                ctx.strokeStyle = color_red;
                ctx.lineWidth = 1;
                ctx.stroke();
            }//if

            //Draw the tiny circle in the center
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, pi2, false);
            ctx.closePath();
            ctx.fill();
        })//forEach


        //Add small lines to year axis
        if(_.indexOf(year_axis, i) >= 0) {
            ctx.strokeStyle = "#c1c1c1";
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1;

            ctx.rotate(a + pi);
            ctx.beginPath();
            ctx.moveTo(0, max_height + 4)
            ctx.lineTo(0, outer_radius * 0.95);
            ctx.closePath();
            ctx.stroke();
            ctx.rotate(-(a + pi));

            ctx.globalAlpha = 1;
        }//if
    }//for i

})//d3.csv

//////////////////////////////////////////////////////////////
////////////////////// Helper functions //////////////////////
//////////////////////////////////////////////////////////////

// Retina non-blurry canvas
function crispyCanvas(canvas, ctx, sf) {
    canvas
        .attr('width', sf * width)
        .attr('height', sf * height)
        .style('width', width + "px")
        .style('height', height + "px");
    ctx.scale(sf, sf);
}//function crispyCanvas

//https://css-tricks.com/snippets/javascript/get-url-variables/
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1]; }
    }
    return (false);
}//function getQueryVariable