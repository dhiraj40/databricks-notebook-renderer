# Databricks notebook source
# MAGIC %md
# MAGIC # Databricks-style source notebook
# MAGIC 
# MAGIC This sample includes markdown, SQL, Python, and `%run` magic so you can
# MAGIC validate the serializer against common Databricks notebook patterns.

# COMMAND ----------

# MAGIC %sql
# MAGIC select "North America" as region, 1240 as orders, "$2.4M" as revenue
# MAGIC union all
# MAGIC select "EMEA" as region, 980 as orders, "$1.9M" as revenue

# COMMAND ----------

run_date = "2026-04-19"
print(f"Revenue pipeline executed for {run_date}")

# COMMAND ----------

%run ./abc

# COMMAND ----------

data = [
    ("North America", 1240),
    ("EMEA", 980),
]

df = spark.createDataFrame(data, ["region", "orders"])
display(df)

# COMMAND ----------



# COMMAND ----------

# MAGIC %md
# MAGIC ## Hellow

# COMMAND ----------



# COMMAND ----------


