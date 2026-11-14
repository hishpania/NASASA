using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Neosphere.Infrastructure.Data;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Neosphere.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261114161314_InitialCreate")]
    partial class InitialCreate
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "10.0.15")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("Neosphere.Domain.Entities.Field", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<double>("AreaHectares")
                        .HasColumnType("double precision");

                    b.Property<DateTimeOffset>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int?>("CreatedBy")
                        .HasColumnType("integer");

                    b.Property<DateTimeOffset>("LastModified")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int?>("LastModifiedBy")
                        .HasColumnType("integer");

                    b.Property<string>("Mode")
                        .IsRequired()
                        .HasMaxLength(16)
                        .HasColumnType("character varying(16)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<int>("OwnerId")
                        .HasColumnType("integer");

                    b.Property<double?>("RadiusMeters")
                        .HasColumnType("double precision");

                    b.ComplexProperty(typeof(Dictionary<string, object>), "Center", "Neosphere.Domain.Entities.Field.Center#GeoPoint", b1 =>
                        {
                            b1.IsRequired();

                            b1.Property<double>("Latitude")
                                .HasColumnType("double precision");

                            b1.Property<double>("Longitude")
                                .HasColumnType("double precision");
                        });

                    b.ComplexProperty(typeof(Dictionary<string, object>), "Place", "Neosphere.Domain.Entities.Field.Place#Place", b1 =>
                        {
                            b1.Property<string>("Description");

                            b1.Property<string>("ExternalId")
                                .IsRequired();

                            b1.Property<string>("Name")
                                .IsRequired();

                            b1.ComplexProperty(typeof(Dictionary<string, object>), "Address", "Neosphere.Domain.Entities.Field.Place#Place.Address#Address", b2 =>
                                {
                                    b2.IsRequired();

                                    b2.Property<string>("City");

                                    b2.Property<string>("Country");

                                    b2.Property<string>("CountryCode");

                                    b2.Property<string>("County");

                                    b2.Property<string>("District");

                                    b2.Property<string>("Postcode");

                                    b2.Property<string>("State");
                                });

                            b1.ComplexProperty(typeof(Dictionary<string, object>), "Bounds", "Neosphere.Domain.Entities.Field.Place#Place.Bounds#GeoBounds", b2 =>
                                {
                                    b2.Property<double>("East");

                                    b2.Property<double>("North");

                                    b2.Property<double>("South");

                                    b2.Property<double>("West");
                                });

                            b1.ComplexProperty(typeof(Dictionary<string, object>), "Point", "Neosphere.Domain.Entities.Field.Place#Place.Point#GeoPoint", b2 =>
                                {
                                    b2.IsRequired();

                                    b2.Property<double>("Latitude");

                                    b2.Property<double>("Longitude");
                                });

                            b1
                                .ToJson("Place")
                                .HasColumnType("jsonb");
                        });

                    b.ComplexCollection(typeof(List<Dictionary<string, object>>), "Points", "Neosphere.Domain.Entities.Field.Points#GeoPoint", b1 =>
                        {
                            b1.IsRequired();

                            b1.Property<double>("Latitude");

                            b1.Property<double>("Longitude");

                            b1
                                .ToJson("Points")
                                .HasColumnType("jsonb");
                        });

                    b.HasKey("Id");

                    b.HasIndex("OwnerId");

                    b.ToTable("Fields");
                });

            modelBuilder.Entity("Neosphere.Domain.Entities.User", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<DateTimeOffset>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int?>("CreatedBy")
                        .HasColumnType("integer");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasMaxLength(256)
                        .HasColumnType("character varying(256)");

                    b.Property<DateTimeOffset>("LastModified")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int?>("LastModifiedBy")
                        .HasColumnType("integer");

                    b.Property<string>("PasswordHash")
                        .IsRequired()
                        .HasMaxLength(512)
                        .HasColumnType("character varying(512)");

                    b.HasKey("Id");

                    b.HasIndex("Email")
                        .IsUnique();

                    b.ToTable("Users");
                });

            modelBuilder.Entity("Neosphere.Domain.Entities.Field", b =>
                {
                    b.HasOne("Neosphere.Domain.Entities.User", "Owner")
                        .WithMany("Fields")
                        .HasForeignKey("OwnerId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Owner");
                });

            modelBuilder.Entity("Neosphere.Domain.Entities.User", b =>
                {
                    b.Navigation("Fields");
                });
#pragma warning restore 612, 618
        }
    }
}
